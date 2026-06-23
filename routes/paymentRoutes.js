const express = require("express");
const {
  createVNPayPayment,
  handleVNPayIpn,
  handleVNPayReturn
} = require("../controllers/paymentController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/vnpay/create", authenticate, createVNPayPayment);
router.get("/vnpay/return", handleVNPayReturn);
router.get("/vnpay/ipn", handleVNPayIpn);

module.exports = router;
