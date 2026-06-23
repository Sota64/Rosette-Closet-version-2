const Product = require("../models/Product");
const Category = require("../models/Category");
const Review = require("../models/Review");
const RentalOrder = require("../models/RentalOrder");
const mongoose = require("mongoose");
const { sendSuccess, sendError } = require("../middleware/response");

const allowedStatuses = ["available", "rented", "maintenance", "outofstock"];
const activeRentalStatuses = ["pending", "approved", "delivering", "renting"];

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const normalizeUploadedImages = (files = {}) => {
  const uploadedFiles = [
    ...(files.image || []),
    ...(files.images || [])
  ];

  return uploadedFiles.map((file) => `/public/uploads/products/${file.filename}`);
};

const normalizeImages = (body, files = {}) => {
  const uploadedImages = normalizeUploadedImages(files);

  if (uploadedImages.length) {
    return uploadedImages;
  }

  if (Array.isArray(body.images)) {
    return body.images.filter(Boolean);
  }

  if (typeof body.images === "string") {
    return body.images
      .split(",")
      .map((image) => image.trim())
      .filter(Boolean);
  }

  if (typeof body.image === "string" && body.image.trim()) {
    return [body.image.trim()];
  }

  return [];
};

const normalizeSizes = (sizes) => {
  if (Array.isArray(sizes)) {
    return sizes.filter(Boolean);
  }

  if (typeof sizes === "string") {
    return sizes
      .split(",")
      .map((size) => size.trim())
      .filter(Boolean);
  }

  return [];
};

const resolveCategoryId = async (category) => {
  if (!category) {
    return null;
  }

  if (mongoose.Types.ObjectId.isValid(category)) {
    return category;
  }

  const name = category.trim();

  if (!name) {
    return null;
  }

  const existingCategory = await Category.findOne({
    name: new RegExp(`^${escapeRegex(name)}$`, "i")
  });

  if (existingCategory) {
    return existingCategory._id;
  }

  const newCategory = await Category.create({
    name
  });

  return newCategory._id;
};

const buildProductPayload = async (body, files = {}, isUpdate = false) => {
  const payload = {};
  const allowedFields = ["code", "name", "description", "color", "status"];

  allowedFields.forEach((field) => {
    if (body[field] !== undefined) {
      payload[field] = typeof body[field] === "string" ? body[field].trim() : body[field];
    }
  });

  if (body.rentalPrice !== undefined) {
    payload.rentalPrice = Number(body.rentalPrice);
  }

  if (body.deposit !== undefined) {
    payload.deposit = Number(body.deposit);
  }

  if (body.sizes !== undefined) {
    payload.sizes = normalizeSizes(body.sizes);
  }

  const uploadedImages = normalizeUploadedImages(files);

  if (uploadedImages.length || body.images !== undefined || body.image !== undefined) {
    payload.images = normalizeImages(body, files);
  }

  if (body.category !== undefined) {
    payload.category = await resolveCategoryId(body.category);
  }

  if (!isUpdate && !payload.images) {
    payload.images = [];
  }

  if (payload.status && !allowedStatuses.includes(payload.status)) {
    throw new Error("Trang thai san pham khong hop le");
  }

  return payload;
};

const buildProductQuery = (query) => {
  const filter = {};

  if (query.search) {
    const searchRegex = new RegExp(escapeRegex(query.search.trim()), "i");
    filter.$or = [{ name: searchRegex }, { code: searchRegex }, { color: searchRegex }];
  }

  if (query.status && query.status !== "all") {
    filter.status = query.status;
  }

  if (query.category && query.category !== "all") {
    if (mongoose.Types.ObjectId.isValid(query.category)) {
      filter.category = query.category;
    }
  }

  if (query.minPrice || query.maxPrice) {
    filter.rentalPrice = {};

    if (query.minPrice) {
      filter.rentalPrice.$gte = Number(query.minPrice);
    }

    if (query.maxPrice) {
      filter.rentalPrice.$lte = Number(query.maxPrice);
    }
  }

  return filter;
};

const getRentedSizesByProduct = async (productIds = []) => {
  if (!productIds.length) return {};

  const objectIds = productIds.map((id) => new mongoose.Types.ObjectId(id));
  const rentedSizes = await RentalOrder.aggregate([
    {
      $match: {
        status: { $in: activeRentalStatuses },
        "items.product": { $in: objectIds }
      }
    },
    { $unwind: "$items" },
    {
      $match: {
        "items.product": { $in: objectIds },
        "items.size": { $exists: true, $nin: [null, ""] }
      }
    },
    {
      $group: {
        _id: "$items.product",
        sizes: { $addToSet: "$items.size" }
      }
    }
  ]);

  return rentedSizes.reduce((result, item) => {
    result[item._id.toString()] = item.sizes;
    return result;
  }, {});
};

const attachSizeAvailability = async (products) => {
  const isArray = Array.isArray(products);
  const productList = isArray ? products : [products].filter(Boolean);
  const productIds = productList.map((product) => product._id.toString());
  const rentedSizesByProduct = await getRentedSizesByProduct(productIds);

  const result = productList.map((product) => {
    const productObj = typeof product.toObject === "function" ? product.toObject() : product;
    const rentedSizes = rentedSizesByProduct[productObj._id.toString()] || [];

    return {
      ...productObj,
      rentedSizes,
      sizeAvailability: (productObj.sizes || []).map((size) => ({
        size,
        status: rentedSizes.includes(size) ? "rented" : "available"
      }))
    };
  });

  return isArray ? result : result[0];
};

const getProducts = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const filter = buildProductQuery(req.query);
    const sort = req.query.sort || "-createdAt";
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    if (req.query.category && req.query.category !== "all" && !filter.category) {
      const category = await Category.findOne({
        name: new RegExp(`^${escapeRegex(req.query.category.trim())}$`, "i")
      });

      filter.category = category ? category._id : new mongoose.Types.ObjectId();
    }

    const [products, total, statusStats, currentMonthProducts, previousMonthProducts] = await Promise.all([
      Product.find(filter)
        .populate("category", "name description")
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
      Product.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]),
      Product.countDocuments({
        createdAt: {
          $gte: currentMonthStart
        }
      }),
      Product.countDocuments({
        createdAt: {
          $gte: previousMonthStart,
          $lt: currentMonthStart
        }
      })
    ]);

    const stats = statusStats.reduce(
      (result, item) => {
        result[item._id] = item.count;
        result.total += item.count;
        return result;
      },
      {
        total: 0,
        available: 0,
        rented: 0,
        maintenance: 0,
        outofstock: 0
      }
    );
    const growthPercent = previousMonthProducts > 0
      ? ((currentMonthProducts - previousMonthProducts) / previousMonthProducts) * 100
      : currentMonthProducts > 0 ? 100 : 0;

    stats.growthPercent = Number(growthPercent.toFixed(1));
    stats.rentedPercent = stats.total > 0
      ? Number(((stats.rented / stats.total) * 100).toFixed(1))
      : 0;
    const productsWithSizeAvailability = await attachSizeAvailability(products);

    return sendSuccess(res, "Lay danh sach san pham thanh cong", {
      products: productsWithSizeAvailability,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats
    });
  } catch (error) {
    return sendError(res, error.message);
  }
};

const getProductById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, "ID san pham khong hop le", 400);
    }

    const product = await Product.findById(req.params.id).populate("category", "name description");

    if (!product) {
      return sendError(res, "Khong tim thay san pham", 404);
    }

    const productWithSizeAvailability = await attachSizeAvailability(product);

    return sendSuccess(res, "Lay chi tiet san pham thanh cong", productWithSizeAvailability);
  } catch (error) {
    return sendError(res, error.message);
  }
};

const getProductDetail = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, "ID san pham khong hop le", 400);
    }

    const product = await Product.findById(req.params.id).populate("category", "name description");

    if (!product) {
      return sendError(res, "Khong tim thay san pham", 404);
    }

    const [similarProducts, reviewStats] = await Promise.all([
      Product.find({
        _id: { $ne: product._id },
        category: product.category?._id || product.category,
        status: "available"
      })
        .populate("category", "name description")
        .sort("-createdAt")
        .limit(4),
      Review.aggregate([
        {
          $match: {
            product: product._id
          }
        },
        {
          $group: {
            _id: "$product",
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 }
          }
        }
      ])
    ]);

    const stats = reviewStats[0] || {
      averageRating: 0,
      totalReviews: 0
    };

    const productWithSizeAvailability = await attachSizeAvailability(product);

    return sendSuccess(res, "Lay chi tiet san pham thanh cong", {
      product: productWithSizeAvailability,
      similarProducts,
      reviewSummary: {
        averageRating: Number((stats.averageRating || 0).toFixed(1)),
        totalReviews: stats.totalReviews || 0
      }
    });
  } catch (error) {
    return sendError(res, error.message);
  }
};

const createProduct = async (req, res) => {
  try {
    const payload = await buildProductPayload(req.body, req.files);
    const product = await Product.create(payload);
    await product.populate("category", "name description");
    const productWithSizeAvailability = await attachSizeAvailability(product);

    return sendSuccess(res, "Tao san pham thanh cong", productWithSizeAvailability, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const updateProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, "ID san pham khong hop le", 400);
    }

    const payload = await buildProductPayload(req.body, req.files, true);
    const product = await Product.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    }).populate("category", "name description");

    if (!product) {
      return sendError(res, "Khong tim thay san pham", 404);
    }
    const productWithSizeAvailability = await attachSizeAvailability(product);

    return sendSuccess(res, "Cap nhat san pham thanh cong", productWithSizeAvailability);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const deleteProduct = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, "ID san pham khong hop le", 400);
    }

    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return sendError(res, "Khong tim thay san pham", 404);
    }

    return sendSuccess(res, "Xoa san pham thanh cong", product);
  } catch (error) {
    return sendError(res, error.message);
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductDetail,
  createProduct,
  updateProduct,
  deleteProduct
};
