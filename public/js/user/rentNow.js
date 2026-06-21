const rentNowState = {
  product: null,
  rentalDays: 3
};

async function loadLayout(placeholderId, url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Lỗi HTTP! Trạng thái: ${response.status}`);
    }

    const html = await response.text();
    document.getElementById(placeholderId).outerHTML = html;

    if (placeholderId === "navbar-placeholder") {
      document.dispatchEvent(new CustomEvent("rosette:navbar-loaded"));
      window.initNavbar?.();
      window.initNavbarAuth?.();
      window.initNavbarCategories?.();
    }
  } catch (error) {
    console.error(`Không thể nạp layout từ ${url}:`, error);
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCurrency(value = 0) {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

function getTodayInputValue() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

function addDays(dateValue, days) {
  const date = new Date(dateValue);
  date.setDate(date.getDate() + days);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function getRentalDays() {
  const startDate = document.getElementById("rental-start-date")?.value;
  const returnDate = document.getElementById("rental-return-date")?.value;

  if (!startDate || !returnDate) return 1;

  const diffMs = new Date(returnDate).getTime() - new Date(startDate).getTime();
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  return Math.max(diffDays, 1);
}

function getProductImage(product) {
  return product?.images?.[0] || "/public/images/img1.png";
}

function getCategoryName(product) {
  return product?.category?.name || "Bộ sưu tập";
}

async function parseApiResponse(response, fallbackMessage) {
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || fallbackMessage);
  }

  return result.data;
}

async function resolveProductId() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (productId) return productId;

  const response = await fetch("/api/products?limit=1&status=available", {
    credentials: "include"
  });
  const data = await parseApiResponse(response, "Không thể tìm sản phẩm để thuê");
  const firstProduct = data.products?.[0];

  if (!firstProduct?._id) {
    throw new Error("Chưa có sản phẩm khả dụng để thuê.");
  }

  return firstProduct._id;
}

async function fetchProduct(productId) {
  const response = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
    credentials: "include"
  });

  return parseApiResponse(response, "Không thể tải sản phẩm");
}

async function fetchCurrentUser() {
  const response = await fetch("/api/auth/me", {
    credentials: "include"
  });
  const data = await parseApiResponse(response, "Vui lòng đăng nhập để đặt thuê sản phẩm");

  return data.user;
}

function setValue(id, value) {
  const input = document.getElementById(id);
  if (input) {
    input.value = value || "";
  }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function renderUser(user) {
  setValue("customer-name", user.fullName);
  setValue("customer-phone", user.phone);
  setValue("customer-email", user.email);
  setValue("customer-address", user.address);
}

function renderProduct(product) {
  const image = document.getElementById("order-product-image");
  const size = product.sizes?.[0] || "Đang cập nhật";

  rentNowState.product = product;

  if (image) {
    image.src = getProductImage(product);
    image.alt = product.name || "Ảnh sản phẩm";
  }

  setText("order-product-name", product.name || "Sản phẩm");
  setText("order-product-category", `Phân loại: ${getCategoryName(product)}`);
  setText("order-product-size", `Size: ${size}`);
  setText("order-product-price", formatCurrency(product.rentalPrice));
  setText("rental-deposit", formatCurrency(product.deposit));

  updateOrderSummary();
}

function updateOrderSummary() {
  const product = rentNowState.product;
  if (!product) return;

  rentNowState.rentalDays = getRentalDays();

  const rentalTotal = Number(product.rentalPrice || 0);
  const deposit = Number(product.deposit || 0);
  const total = rentalTotal + deposit;

  setText("rental-days-label", `Phí thuê (${rentNowState.rentalDays} ngày)`);
  setText("rental-price-total", formatCurrency(rentalTotal));
  setText("rental-deposit", formatCurrency(deposit));
  setText("rental-total", formatCurrency(total));
}

function setFeedback(message, type = "") {
  const feedback = document.getElementById("checkout-feedback");
  if (!feedback) return;

  feedback.textContent = message;
  feedback.className = `checkout-feedback ${type}`.trim();
}

function bindPaymentOptions() {
  document.querySelectorAll(".payment-option").forEach((option) => {
    option.addEventListener("click", () => {
      document.querySelectorAll(".payment-option").forEach((item) => {
        item.classList.toggle("selected", item === option);
      });
    });
  });
}

function bindDateInputs() {
  const startInput = document.getElementById("rental-start-date");
  const returnInput = document.getElementById("rental-return-date");
  const today = getTodayInputValue();

  if (!startInput || !returnInput) return;

  startInput.min = today;
  startInput.value = today;
  returnInput.min = addDays(today, 1);
  returnInput.value = addDays(today, 3);

  startInput.addEventListener("change", () => {
    const minReturnDate = addDays(startInput.value, 1);
    returnInput.min = minReturnDate;

    if (!returnInput.value || returnInput.value <= startInput.value) {
      returnInput.value = addDays(startInput.value, 3);
    }

    updateOrderSummary();
  });

  returnInput.addEventListener("change", updateOrderSummary);
}

function buildOrderPayload() {
  const product = rentNowState.product;
  const startDate = document.getElementById("rental-start-date")?.value;
  const returnDate = document.getElementById("rental-return-date")?.value;
  const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || "bank_transfer";

  if (!product?._id) {
    throw new Error("Không tìm thấy sản phẩm để đặt thuê.");
  }

  if (!startDate || !returnDate) {
    throw new Error("Vui lòng chọn ngày nhận và ngày trả sản phẩm.");
  }

  if (returnDate <= startDate) {
    throw new Error("Ngày trả sản phẩm phải sau ngày nhận.");
  }

  return {
    startDate,
    returnDate,
    paymentMethod,
    items: [
      {
        product: product._id,
        quantity: 1,
        rentalPrice: Number(product.rentalPrice || 0),
        deposit: Number(product.deposit || 0)
      }
    ],
    totalAmount: Number(product.rentalPrice || 0) + Number(product.deposit || 0)
  };
}

async function submitRentalOrder(event) {
  event.preventDefault();

  const button = document.getElementById("confirm-rental-button");

  try {
    setFeedback("");
    if (button) {
      button.disabled = true;
      button.textContent = "Đang tạo đơn...";
    }

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify(buildOrderPayload())
    });
    const data = await parseApiResponse(response, "Không thể tạo đơn thuê");
    const order = data.order || data;

    setFeedback(`Đặt thuê thành công. Mã đơn: #${String(order._id).slice(-6).toUpperCase()}`, "success");
  } catch (error) {
    setFeedback(error.message, "error");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Xác nhận đặt lịch";
    }
  }
}

async function loadRentNowPage() {
  const message = document.getElementById("rent-now-message");
  const form = document.getElementById("rent-now-form");

  try {
    bindDateInputs();
    bindPaymentOptions();

    const productId = await resolveProductId();
    const product = await fetchProduct(productId);

    renderProduct(product);
    if (form) form.hidden = false;

    if (product.status !== "available") {
      const button = document.getElementById("confirm-rental-button");
      if (button) button.disabled = true;
      setFeedback("Sản phẩm này hiện chưa sẵn sàng để thuê.", "error");
    }

    try {
      const user = await fetchCurrentUser();
      renderUser(user);
      if (message) message.hidden = true;
    } catch (authError) {
      const button = document.getElementById("confirm-rental-button");
      if (button) button.disabled = true;
      if (message) {
        message.innerHTML = `
          ${escapeHtml(authError.message)}
          <br>
          <a href="/views/login.html">Đăng nhập để tiếp tục</a>
        `;
      }
    }
  } catch (error) {
    if (message) {
      message.textContent = error.message;
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([
    loadLayout("navbar-placeholder", "/views/layouts/navbar.html"),
    loadLayout("footer-placeholder", "/views/layouts/footer.html")
  ]);

  document.getElementById("rent-now-form")?.addEventListener("submit", submitRentalOrder);
  loadRentNowPage();
});
