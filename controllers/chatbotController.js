const Product = require("../models/Product");
const { sendSuccess, sendError } = require("../middleware/response");

const CHATBOT_AI_URL = process.env.CHATBOT_AI_URL || "http://localhost:3000/v1/api/chat";
const PRODUCT_INTENT_WORDS = [
  "san pham",
  "sp",
  "vay",
  "dam",
  "do",
  "thue",
  "gia",
  "size",
  "mau",
  "tim",
  "con",
  "hang",
  "danh muc",
  "bo suu tap",
  "collection",
  "product",
  "dress"
];
const STOP_WORDS = new Set([
  "toi",
  "tui",
  "minh",
  "ban",
  "co",
  "khong",
  "ko",
  "k",
  "la",
  "va",
  "voi",
  "cho",
  "can",
  "muon",
  "tim",
  "giup",
  "san",
  "pham",
  "nao",
  "nhe",
  "nha",
  "duoc",
  "hay",
  "ve",
  "cai",
  "chiec",
  "mot"
]);

const normalizeText = (value = "") => {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const formatCurrency = (value = 0) => {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ/ngày`;
};

const getStatusLabel = (status = "") => {
  const map = {
    available: "Sẵn sàng",
    rented: "Đang thuê",
    maintenance: "Đang xử lý",
    outofstock: "Hết hàng"
  };

  return map[status] || "Đang cập nhật";
};

const extractSizes = (question = "") => {
  const matches = normalizeText(question).match(/\b(xs|s|m|l|xl|xxl)\b/g) || [];
  return [...new Set(matches.map((size) => size.toUpperCase()))];
};

const extractMaxPrice = (question = "") => {
  const normalizedQuestion = normalizeText(question);
  const hasMaxIntent = /\b(duoi|nho hon|be hon|tam|khoang|toi da|max)\b/.test(normalizedQuestion);
  const match = normalizedQuestion.match(/(\d+(?:[.,]\d+)?)\s*(trieu|tr|k|nghin|ngan|000)?/);

  if (!match || !hasMaxIntent) return null;

  const rawNumber = Number(match[1].replace(",", "."));
  const unit = match[2] || "";

  if (!Number.isFinite(rawNumber)) return null;
  if (["trieu", "tr"].includes(unit)) return rawNumber * 1000000;
  if (["k", "nghin", "ngan"].includes(unit)) return rawNumber * 1000;
  if (unit === "000") return rawNumber * 1000;

  return rawNumber;
};

const extractSearchTokens = (question = "") => {
  return normalizeText(question)
    .split(" ")
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
};

const isProductQuestion = (question = "") => {
  const normalizedQuestion = normalizeText(question);

  return PRODUCT_INTENT_WORDS.some((word) => normalizedQuestion.includes(word)) ||
    extractSizes(question).length > 0 ||
    extractMaxPrice(question) !== null;
};

const buildProductAnswer = (products = [], question = "") => {
  if (!products.length) {
    return "Mình chưa tìm thấy sản phẩm phù hợp trong kho. Bạn thử hỏi rõ hơn về màu, size, danh mục hoặc khoảng giá nhé.";
  }

  const lines = products.map((product, index) => {
    const categoryName = product.category?.name || "Chưa phân loại";
    const sizes = product.sizes?.length ? product.sizes.join(", ") : "Đang cập nhật";
    const link = `/views/user/productDetails.html?id=${product._id}`;

    return [
      `${index + 1}. ${product.name}`,
      `   - Giá thuê: ${formatCurrency(product.rentalPrice)}`,
      `   - Tiền cọc: ${formatCurrency(product.deposit)}`,
      `   - Size: ${sizes}`,
      `   - Màu: ${product.color}`,
      `   - Danh mục: ${categoryName}`,
      `   - Trạng thái: ${getStatusLabel(product.status)}`,
      `   - Xem chi tiết: ${link}`
    ].join("\n");
  });

  return [
    `Mình tìm thấy ${products.length} sản phẩm phù hợp với câu hỏi "${question}":`,
    "",
    lines.join("\n\n")
  ].join("\n");
};

const scoreProduct = (product, tokens = [], requestedSizes = [], maxPrice = null) => {
  const searchableText = normalizeText([
    product.name,
    product.code,
    product.description,
    product.color,
    product.category?.name
  ].filter(Boolean).join(" "));
  let score = 0;

  tokens.forEach((token) => {
    if (searchableText.includes(token)) score += 2;
  });

  if (requestedSizes.length) {
    const productSizes = product.sizes || [];
    const hasRequestedSize = requestedSizes.some((size) => productSizes.includes(size));
    score += hasRequestedSize ? 4 : -4;
  }

  if (maxPrice !== null) {
    score += Number(product.rentalPrice || 0) <= maxPrice ? 3 : -5;
  }

  if (product.status === "available") score += 1;

  return score;
};

const findMatchingProducts = async (question = "") => {
  const tokens = extractSearchTokens(question);
  const requestedSizes = extractSizes(question);
  const maxPrice = extractMaxPrice(question);
  const products = await Product.find({})
    .populate("category", "name")
    .sort("-createdAt")
    .limit(200);

  const scoredProducts = products
    .map((product) => ({
      product,
      score: scoreProduct(product, tokens, requestedSizes, maxPrice)
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ product }) => product);

  if (scoredProducts.length) return scoredProducts;

  return products
    .filter((product) => product.status === "available")
    .slice(0, 6);
};

const askExternalChatbot = async (question = "") => {
  if (typeof fetch !== "function") {
    return "Mình chưa thể gọi AI service từ server hiện tại. Bạn vẫn có thể hỏi mình về sản phẩm trong kho nhé.";
  }

  const response = await fetch(CHATBOT_AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ question })
  });
  const responseText = await response.text();
  let result = responseText;

  try {
    result = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    result = responseText;
  }

  if (!response.ok) {
    throw new Error(result?.message || "AI service chua san sang");
  }

  if (typeof result === "string") return result;

  return result.answer ||
    result.message ||
    result.reply ||
    result.response ||
    result.content ||
    result.data?.answer ||
    result.data?.message ||
    result.data?.reply ||
    result.data?.response ||
    result.data?.content ||
    "Mình đã nhận phản hồi nhưng chưa đọc được nội dung trả lời.";
};

const chatWithBot = async (req, res) => {
  try {
    const question = String(req.body.question || "").trim();

    if (!question) {
      return sendError(res, "Vui long nhap cau hoi", 400);
    }

    if (isProductQuestion(question)) {
      const products = await findMatchingProducts(question);
      return sendSuccess(res, "Tim san pham thanh cong", {
        answer: buildProductAnswer(products, question),
        products
      });
    }

    try {
      const answer = await askExternalChatbot(question);
      return sendSuccess(res, "Chatbot tra loi thanh cong", { answer });
    } catch (error) {
      return sendSuccess(res, "Chatbot fallback thanh cong", {
        answer: "Mình có thể hỗ trợ bạn tìm sản phẩm theo tên, màu, size, danh mục hoặc khoảng giá. Ví dụ: \"tìm váy đỏ size M dưới 500k\"."
      });
    }
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  chatWithBot
};
