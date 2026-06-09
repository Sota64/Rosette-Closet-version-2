const express = require("express");
const { getUsers } = require("../controllers/userController");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticate, authorizeRoles("admin"), getUsers);

module.exports = router;
