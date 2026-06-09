const express = require("express");
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require("../controllers/productController");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
const requireAdmin = [authenticate, authorizeRoles("admin")];

router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", requireAdmin, createProduct);
router.put("/:id", requireAdmin, updateProduct);
router.delete("/:id", requireAdmin, deleteProduct);

module.exports = router;
