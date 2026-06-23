const {
  VNPay,
  InpOrderAlreadyConfirmed,
  IpnFailChecksum,
  IpnInvalidAmount,
  IpnOrderNotFound,
  IpnSuccess,
  IpnUnknownError
} = require("vnpay");
const Payment = require("../models/Payment");
const RentalOrder = require("../models/RentalOrder");
const { sendSuccess, sendError } = require("../middleware/response");

const getClientIp = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "127.0.0.1"
  ).replace("::1", "127.0.0.1");
};

const getBaseUrl = (req) => {
  return `${req.protocol}://${req.get("host")}`;
};

const getReturnUrl = (req) => {
  return process.env.VNPAY_RETURN_URL || `${getBaseUrl(req)}/api/payments/vnpay/return`;
};

const getVNPayHost = () => {
  if (process.env.VNPAY_HOST) return process.env.VNPAY_HOST;

  if (process.env.VNPAY_URL) {
    try {
      return new URL(process.env.VNPAY_URL).origin;
    } catch (error) {
      return "https://sandbox.vnpayment.vn";
    }
  }

  return "https://sandbox.vnpayment.vn";
};

const getVNPayPaymentEndpoint = () => {
  if (!process.env.VNPAY_URL) return "paymentv2/vpcpay.html";

  try {
    return new URL(process.env.VNPAY_URL).pathname.replace(/^\/+/, "");
  } catch (error) {
    return "paymentv2/vpcpay.html";
  }
};

const createVNPayClient = () => {
  const tmnCode = process.env.VNPAY_TMN_CODE;
  const secureSecret = process.env.VNPAY_HASH_SECRET;

  if (!tmnCode || !secureSecret) {
    throw new Error("Thieu cau hinh VNPAY_TMN_CODE hoac VNPAY_HASH_SECRET");
  }

  return new VNPay({
    tmnCode,
    secureSecret,
    vnpayHost: getVNPayHost(),
    testMode: process.env.VNPAY_TEST_MODE !== "false",
    hashAlgorithm: "SHA512",
    endpoints: {
      paymentEndpoint: getVNPayPaymentEndpoint()
    }
  });
};

const createVNPayPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return sendError(res, "Vui long truyen ma don hang", 400);
    }

    const order = await RentalOrder.findById(orderId);

    if (!order) {
      return sendError(res, "Khong tim thay don hang", 404);
    }

    if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return sendError(res, "Ban khong co quyen thanh toan don hang nay", 403);
    }

    let payment = await Payment.findOne({
      rentalOrder: order._id,
      method: "vnpay"
    });

    if (!payment) {
      payment = await Payment.create({
        rentalOrder: order._id,
        amount: order.totalAmount,
        method: "vnpay",
        status: "pending"
      });
    }

    if (payment.status === "paid") {
      return sendError(res, "Don hang nay da duoc thanh toan", 400);
    }

    const txnRef = `${order._id.toString()}${Date.now()}`;
    payment.txnRef = txnRef;
    payment.amount = order.totalAmount;
    payment.status = "pending";
    await payment.save();

    const vnpay = createVNPayClient();
    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: order.totalAmount,
      vnp_IpAddr: getClientIp(req),
      vnp_ReturnUrl: getReturnUrl(req),
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan don thue ${order._id.toString()}`,
      vnp_OrderType: "other"
    });

    return sendSuccess(res, "Tao URL thanh toan VNPAY thanh cong", {
      paymentUrl,
      payment
    });
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const syncPaymentResult = async (payment, query, isPaid) => {
  payment.transactionNo = query.vnp_TransactionNo;
  payment.bankCode = query.vnp_BankCode;
  payment.responseCode = query.vnp_ResponseCode;
  payment.payDate = query.vnp_PayDate;
  payment.secureHash = query.vnp_SecureHash;
  payment.status = isPaid ? "paid" : "failed";
  await payment.save();
};

const handleVNPayReturn = async (req, res) => {
  try {
    const vnpay = createVNPayClient();
    const verification = vnpay.verifyReturnUrl(req.query);
    const txnRef = req.query.vnp_TxnRef;
    const orderId = String(txnRef || "").slice(0, 24);
    const payment = await Payment.findOne({
      txnRef,
      method: "vnpay"
    });

    if (!payment) {
      return res.redirect(`/views/user/orders.html?vnpay=missing&orderId=${encodeURIComponent(orderId)}`);
    }

    const isPaid = verification.isVerified && verification.isSuccess;
    await syncPaymentResult(payment, req.query, isPaid);

    const redirectPath = isPaid
      ? `/views/user/checkout-success.html?orderId=${encodeURIComponent(payment.rentalOrder.toString())}&payment=vnpay`
      : `/views/user/orders.html?vnpay=failed&orderId=${encodeURIComponent(payment.rentalOrder.toString())}`;

    return res.redirect(redirectPath);
  } catch (error) {
    return res.redirect(`/views/user/orders.html?vnpay=error&message=${encodeURIComponent(error.message)}`);
  }
};

const handleVNPayIpn = async (req, res) => {
  try {
    const vnpay = createVNPayClient();
    const verification = vnpay.verifyIpnCall(req.query);

    if (!verification.isVerified) {
      return res.json(IpnFailChecksum);
    }

    const payment = await Payment.findOne({
      txnRef: req.query.vnp_TxnRef,
      method: "vnpay"
    });

    if (!payment) {
      return res.json(IpnOrderNotFound);
    }

    if (Number(verification.vnp_Amount) !== Number(payment.amount)) {
      return res.json(IpnInvalidAmount);
    }

    if (payment.status === "paid") {
      return res.json(InpOrderAlreadyConfirmed);
    }

    await syncPaymentResult(payment, req.query, verification.isSuccess);
    return res.json(IpnSuccess);
  } catch (error) {
    return res.json(IpnUnknownError);
  }
};

module.exports = {
  createVNPayPayment,
  handleVNPayIpn,
  handleVNPayReturn
};
