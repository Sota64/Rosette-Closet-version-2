const express = require("express");
const { getCategories, createCategory } = require("../controllers/categoryController");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", getCategories);
router.post("/", authenticate, authorizeRoles("admin"), createCategory);

module.exports = router;
