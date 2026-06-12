const express = require("express");
const {
  createOrder,
  getOrders,
  getMyOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  deleteOrder
} = require("../controllers/rentalOrderController");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
const requireAdmin = [authenticate, authorizeRoles("admin")];

router.post("/", authenticate, createOrder);
router.get("/", requireAdmin, getOrders);
router.get("/my", authenticate, getMyOrders);
router.get("/:id", authenticate, getOrderById);
router.put("/:id", requireAdmin, updateOrder);
router.put("/:id/status", requireAdmin, updateOrderStatus);
router.delete("/:id", requireAdmin, deleteOrder);

module.exports = router;
