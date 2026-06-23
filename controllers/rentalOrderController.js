const RentalOrder = require("../models/RentalOrder");
const Product = require("../models/Product");
const Payment = require("../models/Payment");
const mongoose = require("mongoose");
const { sendSuccess, sendError } = require("../middleware/response");

const orderStatuses = ["pending", "approved", "delivering", "renting", "returned", "completed", "cancelled"];
const paymentMethods = ["bank_transfer", "cash_on_delivery"];
const forwardOrderStatusFlow = ["pending", "approved", "delivering", "renting", "returned", "completed"];

const getNextOrderStatus = (status) => {
  const currentIndex = forwardOrderStatusFlow.indexOf(status);
  return currentIndex >= 0 ? forwardOrderStatusFlow[currentIndex + 1] : null;
};

const canMoveOrderStatus = (currentStatus, nextStatus) => {
  return currentStatus === nextStatus || getNextOrderStatus(currentStatus) === nextStatus;
};

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const buildOrderQuery = (query) => {
  const filter = {};

  if (query.status && query.status !== "all") {
    filter.status = query.status;
  }

  if (query.user && mongoose.Types.ObjectId.isValid(query.user)) {
    filter.user = query.user;
  }

  if (query.fromDate || query.toDate) {
    filter.startDate = {};

    if (query.fromDate) {
      filter.startDate.$gte = new Date(query.fromDate);
    }

    if (query.toDate) {
      filter.startDate.$lte = new Date(query.toDate);
    }
  }

  return filter;
};

const buildOrderItems = async (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Don thue phai co it nhat mot san pham");
  }

  const productIds = items.map((item) => item.product).filter(Boolean);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = products.reduce((result, product) => {
    result[product._id.toString()] = product;
    return result;
  }, {});

  return items.map((item) => {
    const product = productMap[item.product];

    if (!product) {
      throw new Error("San pham trong don thue khong ton tai");
    }

    return {
      product: product._id,
      size: item.size,
      quantity: 1,
      rentalPrice: item.rentalPrice !== undefined ? Number(item.rentalPrice) : product.rentalPrice,
      deposit: item.deposit !== undefined ? Number(item.deposit) : product.deposit
    };
  });
};

const calculateRentalDays = (startDate, returnDate) => {
  const start = new Date(startDate);
  const end = new Date(returnDate);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  return Math.max(diffDays, 1);
};

const calculateTotalAmount = (items, startDate, returnDate) => {
  const rentalDays = calculateRentalDays(startDate, returnDate);

  return items.reduce((total, item) => {
    return total + ((item.rentalPrice + item.deposit) * rentalDays) * item.quantity;
  }, 0);
};

const populateOrder = (query) => {
  return query
    .populate("user", "fullName email phone address")
    .populate("items.product", "name rentalPrice deposit status images code");
};

const createOrder = async (req, res) => {
  try {
    const items = await buildOrderItems(req.body.items);
    const orderData = {
      ...req.body,
      user: req.user.role === "admin" && req.body.user ? req.body.user : req.user._id,
      items,
      totalAmount: req.body.totalAmount !== undefined
        ? Number(req.body.totalAmount)
        : calculateTotalAmount(items, req.body.startDate, req.body.returnDate)
    };
    const paymentMethod = req.body.paymentMethod;

    delete orderData.paymentMethod;

    if (paymentMethod && !paymentMethods.includes(paymentMethod)) {
      return sendError(res, "Phuong thuc thanh toan khong hop le", 400);
    }

    const order = await RentalOrder.create(orderData);
    await order.populate("user", "fullName email phone address");
    await order.populate("items.product", "name rentalPrice deposit status images code");

    let payment = null;

    if (paymentMethod) {
      payment = await Payment.create({
        rentalOrder: order._id,
        amount: order.totalAmount,
        method: paymentMethod
      });
    }

    return sendSuccess(res, "Tao don thue thanh cong", {
      order,
      payment
    }, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const getOrders = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const filter = buildOrderQuery(req.query);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (req.query.search) {
      const searchRegex = new RegExp(escapeRegex(req.query.search.trim()), "i");
      const matchedProducts = await Product.find({ name: searchRegex }).select("_id");
      const productIds = matchedProducts.map((product) => product._id);

      filter.$or = [
        ...(mongoose.Types.ObjectId.isValid(req.query.search) ? [{ _id: req.query.search }] : []),
        { "items.product": { $in: productIds } }
      ];
    }

    const [orders, total, statusStats, totalRevenue, todayNew] = await Promise.all([
      populateOrder(RentalOrder.find(filter).sort("-createdAt").skip(skip).limit(limit)),
      RentalOrder.countDocuments(filter),
      RentalOrder.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]),
      RentalOrder.aggregate([
        {
          $match: {
            status: { $ne: "cancelled" }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" }
          }
        }
      ]),
      RentalOrder.countDocuments({
        createdAt: {
          $gte: todayStart
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
        pending: 0,
        approved: 0,
        delivering: 0,
        renting: 0,
        returned: 0,
        completed: 0,
        cancelled: 0,
        revenue: totalRevenue[0]?.total || 0,
        todayNew
      }
    );

    return sendSuccess(res, "Lay danh sach don thue thanh cong", {
      orders,
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

const getMyOrders = async (req, res) => {
  req.query.user = req.user._id.toString();
  return getOrders(req, res);
};

const getOrderById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, "ID don thue khong hop le", 400);
    }

    const order = await populateOrder(RentalOrder.findById(req.params.id));

    if (!order) {
      return sendError(res, "Khong tim thay don thue", 404);
    }

    const isOwner = order.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isAdmin && !isOwner) {
      return sendError(res, "Ban khong co quyen xem don thue nay", 403);
    }

    const payment = await Payment.findOne({ rentalOrder: order._id });
    const orderObj = order.toObject();
    orderObj.payment = payment;

    return sendSuccess(res, "Lay chi tiet don thue thanh cong", orderObj);
  } catch (error) {
    return sendError(res, error.message);
  }
};

const updateOrder = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, "ID don thue khong hop le", 400);
    }

    const payload = {};
    const allowedFields = ["startDate", "returnDate", "status", "user", "totalAmount"];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        payload[field] = req.body[field];
      }
    });

    let existingOrder = null;
    const needsExistingOrder = req.body.items !== undefined ||
      (payload.status !== undefined) ||
      (req.body.totalAmount === undefined && (req.body.startDate !== undefined || req.body.returnDate !== undefined));

    if (needsExistingOrder) {
      existingOrder = await RentalOrder.findById(req.params.id);
      if (!existingOrder) {
        return sendError(res, "Khong tim thay don thue", 404);
      }
    }

    if (payload.status !== undefined && !canMoveOrderStatus(existingOrder.status, payload.status)) {
      return sendError(res, "Khong the quay lai hoac bo qua trang thai don thue", 400);
    }

    if (req.body.items !== undefined || (req.body.totalAmount === undefined && (req.body.startDate !== undefined || req.body.returnDate !== undefined))) {
      if (req.body.items !== undefined) {
        payload.items = await buildOrderItems(req.body.items);
      }

      payload.totalAmount = req.body.totalAmount !== undefined
        ? Number(req.body.totalAmount)
        : calculateTotalAmount(
          payload.items || existingOrder.items,
          payload.startDate || existingOrder.startDate,
          payload.returnDate || existingOrder.returnDate
        );
    }

    if (payload.status && !orderStatuses.includes(payload.status)) {
      return sendError(res, "Trang thai don thue khong hop le", 400);
    }

    const order = await populateOrder(RentalOrder.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    }));

    if (!order) {
      return sendError(res, "Khong tim thay don thue", 404);
    }

    return sendSuccess(res, "Cap nhat don thue thanh cong", order);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, "ID don thue khong hop le", 400);
    }

    if (!status) {
      return sendError(res, "Vui long nhap trang thai don", 400);
    }

    if (!orderStatuses.includes(status)) {
      return sendError(res, "Trang thai don thue khong hop le", 400);
    }

    const currentOrder = await RentalOrder.findById(req.params.id);

    if (!currentOrder) {
      return sendError(res, "Khong tim thay don thue", 404);
    }

    if (!canMoveOrderStatus(currentOrder.status, status)) {
      return sendError(res, "Khong the quay lai hoac bo qua trang thai don thue", 400);
    }

    const order = await populateOrder(RentalOrder.findByIdAndUpdate(
      currentOrder._id,
      { status },
      {
        new: true,
        runValidators: true
      }
    ));

    if (!order) {
      return sendError(res, "Khong tim thay don thue", 404);
    }

    return sendSuccess(res, "Cap nhat trang thai don thue thanh cong", order);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const deleteOrder = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, "ID don thue khong hop le", 400);
    }

    const order = await RentalOrder.findByIdAndDelete(req.params.id);

    if (!order) {
      return sendError(res, "Khong tim thay don thue", 404);
    }

    return sendSuccess(res, "Xoa don thue thanh cong", order);
  } catch (error) {
    return sendError(res, error.message);
  }
};

const getOrderReports = async (req, res) => {
  try {
    const statsArray = await RentalOrder.aggregate([
      {
        $match: { status: { $ne: "cancelled" } }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          maxOrder: { $max: "$totalAmount" },
          minOrder: { $min: "$totalAmount" },
          avgOrder: { $avg: "$totalAmount" },
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = statsArray[0] || {
      totalRevenue: 0,
      maxOrder: 0,
      minOrder: 0,
      avgOrder: 0,
      count: 0
    };

    const statsByDay = await RentalOrder.aggregate([
      {
        $match: { status: { $ne: "cancelled" } }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$startDate" } },
          totalRevenue: { $sum: "$totalAmount" },
          count: { $sum: 1 },
          maxOrder: { $max: "$totalAmount" },
          minOrder: { $min: "$totalAmount" },
          avgOrder: { $avg: "$totalAmount" }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    const statsByMonth = await RentalOrder.aggregate([
      {
        $match: { status: { $ne: "cancelled" } }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$startDate" } },
          totalRevenue: { $sum: "$totalAmount" },
          count: { $sum: 1 },
          maxOrder: { $max: "$totalAmount" },
          minOrder: { $min: "$totalAmount" },
          avgOrder: { $avg: "$totalAmount" }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    const statsByYear = await RentalOrder.aggregate([
      {
        $match: { status: { $ne: "cancelled" } }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y", date: "$startDate" } },
          totalRevenue: { $sum: "$totalAmount" },
          count: { $sum: 1 },
          maxOrder: { $max: "$totalAmount" },
          minOrder: { $min: "$totalAmount" },
          avgOrder: { $avg: "$totalAmount" }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    return sendSuccess(res, "Lay bao cao thong ke thanh cong", {
      stats,
      statsByDay,
      statsByMonth,
      statsByYear
    });
  } catch (error) {
    return sendError(res, error.message);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getMyOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderReports
};
