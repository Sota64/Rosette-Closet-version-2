const Category = require("../models/Category");
const { sendSuccess, sendError } = require("../middleware/response");

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    return sendSuccess(res, "Lay danh sach danh muc thanh cong", categories);
  } catch (error) {
    return sendError(res, error.message);
  }
};

const createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    return sendSuccess(res, "Tao danh muc thanh cong", category, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

module.exports = {
  getCategories,
  createCategory
};

