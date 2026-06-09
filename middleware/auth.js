const User = require("../models/User");
const { sendError } = require("./response");
const { createAccessToken, setAccessCookie, verifyToken } = require("../utils/token");

const getUserFromPayload = async (payload) => {
  const user = await User.findById(payload.id).select("-password");

  if (!user || !user.isActive) {
    return null;
  }

  return user;
};

const authenticate = async (req, res, next) => {
  try {
    let payload;

    try {
      payload = verifyToken(req.cookies.accessToken, "access");
    } catch (error) {
      const refreshPayload = verifyToken(req.cookies.refreshToken, "refresh");
      const refreshUser = await getUserFromPayload(refreshPayload);

      if (!refreshUser) {
        return sendError(res, "Tai khoan khong ton tai hoac da bi khoa", 401);
      }

      const newAccessToken = createAccessToken(refreshUser);
      setAccessCookie(res, newAccessToken);
      payload = verifyToken(newAccessToken, "access");
    }

    const user = await getUserFromPayload(payload);

    if (!user) {
      return sendError(res, "Tai khoan khong ton tai hoac da bi khoa", 401);
    }

    req.user = user;
    return next();
  } catch (error) {
    return sendError(res, "Vui long dang nhap lai", 401);
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, "Ban khong co quyen thuc hien hanh dong nay", 403);
    }

    return next();
  };
};

module.exports = {
  authenticate,
  authorizeRoles
};
