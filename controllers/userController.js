const User = require("../models/User");
const { sendSuccess, sendError } = require("../middleware/response");

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    return sendSuccess(res, "Lay danh sach nguoi dung thanh cong", users);
  } catch (error) {
    return sendError(res, error.message);
  }
};

module.exports = {
  getUsers
};

