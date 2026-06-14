const express = require("express");
const { getDashboard } = require("../controllers/dashboardController");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticate, authorizeRoles("admin"), getDashboard);

module.exports = router;
