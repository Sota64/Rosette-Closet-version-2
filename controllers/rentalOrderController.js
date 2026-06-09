const RentalOrder = require("../models/RentalOrder");
const { sendSuccess, sendError } = require("../middleware/response");

const createOrder = async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      user: req.user._id
    };

    const order = await RentalOrder.create(orderData);
    return sendSuccess(res, "Tao don thue thanh cong", order, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await RentalOrder.find()
      .populate("user", "fullName email phone")
      .populate("items.product", "name rentalPrice deposit status");

    return sendSuccess(res, "Lay danh sach don thue thanh cong", orders);
  } catch (error) {
    return sendError(res, error.message);
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await RentalOrder.findById(req.params.id)
      .populate("user", "fullName email phone address")
      .populate("items.product", "name rentalPrice deposit status images");

    if (!order) {
      return sendError(res, "Khong tim thay don thue", 404);
    }

    const isOwner = order.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isAdmin && !isOwner) {
      return sendError(res, "Ban khong co quyen xem don thue nay", 403);
    }

    return sendSuccess(res, "Lay chi tiet don thue thanh cong", order);
  } catch (error) {
    return sendError(res, error.message);
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return sendError(res, "Vui long nhap trang thai don", 400);
    }

    const order = await RentalOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        new: true,
        runValidators: true
      }
    );

    if (!order) {
      return sendError(res, "Khong tim thay don thue", 404);
    }

    return sendSuccess(res, "Cap nhat trang thai don thue thanh cong", order);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus
};
