const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { sendSuccess, sendError } = require("../middleware/response");
const {
  createAccessToken,
  createRefreshToken,
  setAuthCookies,
  setAccessCookie,
  clearAuthCookies,
  verifyToken
} = require("../utils/token");

const sanitizeUser = (user) => {
  const userData = user.toObject();
  delete userData.password;
  return userData;
};

const buildAuthResponse = (user) => {
  const userData = sanitizeUser(user);
  return {
    user: userData
  };
};

const issueAuthCookies = (res, user) => {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);
  setAuthCookies(res, accessToken, refreshToken);
};

const register = async (req, res) => {
  try {
    const { fullName, email, password, phone, address } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return sendError(res, "Email da duoc su dung", 400);
    }

    const user = await User.create({
      fullName,
      email,
      password,
      phone,
      address
    });

    issueAuthCookies(res, user);

    return sendSuccess(res, "Dang ky tai khoan thanh cong", buildAuthResponse(user), 201);
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

    if (!user.isActive) {
      return sendError(res, "Tai khoan da bi khoa", 403);
    }

    issueAuthCookies(res, user);

    return sendSuccess(res, "Dang nhap thanh cong", buildAuthResponse(user));
  } catch (error) {
    return sendError(res, error.message);
  }
};

const refreshAccessToken = async (req, res) => {
  try {
    const payload = verifyToken(req.cookies.refreshToken, "refresh");
    const user = await User.findById(payload.id);

    if (!user || !user.isActive) {
      return sendError(res, "Tai khoan khong ton tai hoac da bi khoa", 401);
    }

    const accessToken = createAccessToken(user);
    setAccessCookie(res, accessToken);

    return sendSuccess(res, "Lam moi access token thanh cong", buildAuthResponse(user));
  } catch (error) {
    clearAuthCookies(res);
    return sendError(res, "Refresh token khong hop le hoac da het han", 401);
  }
};

const getCurrentUser = (req, res) => {
  return sendSuccess(res, "Lay thong tin dang nhap thanh cong", {
    user: req.user
  });
};

const logout = (req, res) => {
  clearAuthCookies(res);
  return sendSuccess(res, "Dang xuat thanh cong");
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  getCurrentUser,
  logout
};
