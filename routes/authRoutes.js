const express = require("express");
const {
  register,
  login,
  refreshAccessToken,
  getCurrentUser,
  logout
} = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshAccessToken);
router.get("/me", authenticate, getCurrentUser);
router.post("/logout", logout);

module.exports = router;
