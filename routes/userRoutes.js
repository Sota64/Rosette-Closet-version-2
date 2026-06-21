const express = require("express");
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateMyProfile
} = require("../controllers/userController");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
const requireAdmin = [authenticate, authorizeRoles("admin")];

router.get("/", requireAdmin, getUsers);
router.post("/", requireAdmin, createUser);
router.put("/profile/me", authenticate, updateMyProfile);
router.get("/:id", requireAdmin, getUserById);
router.put("/:id", requireAdmin, updateUser);
router.delete("/:id", requireAdmin, deleteUser);

module.exports = router;
