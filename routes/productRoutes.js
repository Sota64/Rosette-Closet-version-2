const express = require("express");
const {
  getProducts,
  getProductById,
  getProductDetail,
  createProduct,
  updateProduct,
  deleteProduct
} = require("../controllers/productController");
const { authenticate, authorizeRoles } = require("../middleware/auth");
const { uploadProductImages } = require("../middleware/upload");

const router = express.Router();
const requireAdmin = [authenticate, authorizeRoles("admin")];

router.get("/", getProducts);
router.get("/:id/detail", getProductDetail);
router.get("/:id", getProductById);
router.post("/", ...requireAdmin, uploadProductImages, createProduct);
router.put("/:id", ...requireAdmin, uploadProductImages, updateProduct);
router.delete("/:id", requireAdmin, deleteProduct);

module.exports = router;
