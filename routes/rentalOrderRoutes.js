const express = require("express");
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus
} = require("../controllers/rentalOrderController");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
const requireAdmin = [authenticate, authorizeRoles("admin")];

router.post("/", authenticate, createOrder);
router.get("/", requireAdmin, getOrders);
router.get("/:id", authenticate, getOrderById);
router.put("/:id/status", requireAdmin, updateOrderStatus);

module.exports = router;
