const User = require("../models/User");
const mongoose = require("mongoose");
const { sendSuccess, sendError } = require("../middleware/response");

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const sanitizeUser = (user) => {
  const userData = user.toObject();
  delete userData.password;
  return userData;
};

const buildUserFilter = (query) => {
  const filter = {};

  if (query.search) {
    const searchRegex = new RegExp(escapeRegex(query.search.trim()), "i");
    filter.$or = [
      { fullName: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
      { address: searchRegex }
    ];
  }

  if (query.role && query.role !== "all") {
    filter.role = query.role;
  }

  if (query.isActive !== undefined && query.isActive !== "all") {
    filter.isActive = query.isActive === "true";
  }

  return filter;
};

const getUsers = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const filter = buildUserFilter(req.query);

    const [users, total, stats] = await Promise.all([
      User.find(filter).select("-password").sort("-createdAt").skip(skip).limit(limit),
      User.countDocuments(filter),
      User.aggregate([
        {
          $group: {
            _id: {
              role: "$role",
              isActive: "$isActive"
            },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const summary = stats.reduce(
      (result, item) => {
        result.total += item.count;
        result[item._id.role] = (result[item._id.role] || 0) + item.count;
        if (item._id.isActive) {
          result.active += item.count;
        } else {
          result.inactive += item.count;
        }
        return result;
      },
      {
        total: 0,
        customer: 0,
        admin: 0,
        active: 0,
        inactive: 0
      }
    );

    return sendSuccess(res, "Lay danh sach nguoi dung thanh cong", {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: summary
    });
  } catch (error) {
    return sendError(res, error.message);
  }
};

const getUserById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, "ID nguoi dung khong hop le", 400);
    }

    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return sendError(res, "Khong tim thay nguoi dung", 404);
    }

    return sendSuccess(res, "Lay chi tiet nguoi dung thanh cong", user);
  } catch (error) {
    return sendError(res, error.message);
  }
};

const createUser = async (req, res) => {
  try {
    const { fullName, email, password, phone, address, role, isActive } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return sendError(res, "Email da duoc su dung", 400);
    }

    const user = await User.create({
      fullName,
      email,
      password,
      phone,
      address,
      role,
      isActive
    });

    return sendSuccess(res, "Tao nguoi dung thanh cong", sanitizeUser(user), 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const updateUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, "ID nguoi dung khong hop le", 400);
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return sendError(res, "Khong tim thay nguoi dung", 404);
    }

    const allowedFields = ["fullName", "email", "phone", "address", "role", "isActive", "password"];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    return sendSuccess(res, "Cap nhat nguoi dung thanh cong", sanitizeUser(user));
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const deleteUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, "ID nguoi dung khong hop le", 400);
    }

    if (req.params.id === req.user._id.toString()) {
      return sendError(res, "Khong the xoa tai khoan dang dang nhap", 400);
    }

    const user = await User.findByIdAndDelete(req.params.id).select("-password");

    if (!user) {
      return sendError(res, "Khong tim thay nguoi dung", 404);
    }

    return sendSuccess(res, "Xoa nguoi dung thanh cong", user);
  } catch (error) {
    return sendError(res, error.message);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
