const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { sendSuccess, sendError } = require("../middleware/response");

const register = async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      return sendError(res, "Email da duoc su dung", 400);
    }

    const user = await User.create(req.body);
    const userData = user.toObject();
    delete userData.password;

    return sendSuccess(res, "Dang ky tai khoan thanh cong", userData, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, "Vui long nhap email va mat khau", 400);
    }

    const user = await User.findOne({ email });

    if (!user) {
      return sendError(res, "Email hoac mat khau khong dung", 401);
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return sendError(res, "Email hoac mat khau khong dung", 401);
    }

    const userData = user.toObject();
    delete userData.password;

    return sendSuccess(res, "Dang nhap thanh cong", userData);
  } catch (error) {
    return sendError(res, error.message);
  }
};

module.exports = {
  register,
  login
};

