const Product = require("../models/Product");
const { sendSuccess, sendError } = require("../middleware/response");

const getProducts = async (req, res) => {
  try {
    const products = await Product.find().populate("category", "name description");
    return sendSuccess(res, "Lay danh sach san pham thanh cong", products);
  } catch (error) {
    return sendError(res, error.message);
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category", "name description");

    if (!product) {
      return sendError(res, "Khong tim thay san pham", 404);
    }

    return sendSuccess(res, "Lay chi tiet san pham thanh cong", product);
  } catch (error) {
    return sendError(res, error.message);
  }
};

const createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    return sendSuccess(res, "Tao san pham thanh cong", product, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!product) {
      return sendError(res, "Khong tim thay san pham", 404);
    }

    return sendSuccess(res, "Cap nhat san pham thanh cong", product);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const deleteProduct = async (req, res) => {
  try {
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
  createProduct,
  updateProduct,
  deleteProduct
};

