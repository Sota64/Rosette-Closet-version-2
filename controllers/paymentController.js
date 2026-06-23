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
const PendingVnpayOrder = require("../models/PendingVnpayOrder");
const Product = require("../models/Product");
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

const buildPendingOrderItems = async (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Don thue phai co it nhat mot san pham");
  }

  const productIds = items.map((item) => item.product).filter(Boolean);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = products.reduce((result, product) => {
    result[product._id.toString()] = product;
    return result;
  }, {});

  return items.map((item) => {
    const product = productMap[item.product];

    if (!product) {
      throw new Error("San pham trong don thue khong ton tai");
    }

    return {
      product: product._id,
      size: item.size,
      quantity: Number(item.quantity) || 1,
      rentalPrice: item.rentalPrice !== undefined ? Number(item.rentalPrice) : product.rentalPrice,
      deposit: item.deposit !== undefined ? Number(item.deposit) : product.deposit
    };
  });
};

const calculateRentalDays = (startDate, returnDate) => {
  const start = new Date(startDate);
  const end = new Date(returnDate);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  return Math.max(diffDays, 1);
};

const calculateTotalAmount = (items, startDate, returnDate) => {
  const rentalDays = calculateRentalDays(startDate, returnDate);

  return items.reduce((total, item) => {
    return total + ((item.rentalPrice + item.deposit) * rentalDays) * item.quantity;
  }, 0);
};

const createVNPayPayment = async (req, res) => {
  try {
    const items = await buildPendingOrderItems(req.body.items);
    if (!req.body.startDate || !req.body.returnDate) {
      return sendError(res, "Vui long chon ngay thue va ngay tra", 400);
    }

    if (new Date(req.body.returnDate) <= new Date(req.body.startDate)) {
      return sendError(res, "Ngay tra phai sau ngay thue", 400);
    }

    const totalAmount = calculateTotalAmount(items, req.body.startDate, req.body.returnDate);

    const txnRef = `${Date.now()}${Math.floor(Math.random() * 1000000).toString().padStart(6, "0")}`;
    const pendingOrder = await PendingVnpayOrder.create({
      user: req.user._id,
      txnRef,
      amount: totalAmount,
      orderPayload: {
        startDate: req.body.startDate,
        returnDate: req.body.returnDate,
        totalAmount,
        items
      },
      orderSource: req.body.orderSource === "cart" ? "cart" : "direct",
      status: "pending"
    });

    const vnpay = createVNPayClient();
    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: totalAmount,
      vnp_IpAddr: getClientIp(req),
      vnp_ReturnUrl: getReturnUrl(req),
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan don thue tam ${txnRef}`,
      vnp_OrderType: "other"
    });

    return sendSuccess(res, "Tao URL thanh toan VNPAY thanh cong", {
      paymentUrl,
      pendingOrderId: pendingOrder._id
    });
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const syncPaymentResult = (record, query, isPaid) => {
  record.transactionNo = query.vnp_TransactionNo;
  record.bankCode = query.vnp_BankCode;
  record.responseCode = query.vnp_ResponseCode;
  record.payDate = query.vnp_PayDate;
  record.secureHash = query.vnp_SecureHash;
  record.status = isPaid ? "paid" : "failed";
};

const completePendingOrderPayment = async (pendingOrder, query) => {
  if (pendingOrder.rentalOrder) {
    return pendingOrder.rentalOrder;
  }

  const order = await RentalOrder.create({
    user: pendingOrder.user,
    items: pendingOrder.orderPayload.items,
    startDate: pendingOrder.orderPayload.startDate,
    returnDate: pendingOrder.orderPayload.returnDate,
    totalAmount: pendingOrder.amount,
    status: "approved"
  });

  await Payment.create({
    rentalOrder: order._id,
    amount: pendingOrder.amount,
    method: "vnpay",
    status: "paid",
    txnRef: pendingOrder.txnRef,
    transactionNo: query.vnp_TransactionNo,
    bankCode: query.vnp_BankCode,
    responseCode: query.vnp_ResponseCode,
    payDate: query.vnp_PayDate,
    secureHash: query.vnp_SecureHash
  });

  pendingOrder.rentalOrder = order._id;
  pendingOrder.status = "paid";
  await pendingOrder.save();

  return order._id;
};

const handleVNPayReturn = async (req, res) => {
  try {
    const vnpay = createVNPayClient();
    const verification = vnpay.verifyReturnUrl(req.query);
    const txnRef = req.query.vnp_TxnRef;
    const pendingOrder = await PendingVnpayOrder.findOne({ txnRef });

    if (!pendingOrder) {
      const paidPayment = await Payment.findOne({ txnRef, method: "vnpay", status: "paid" });
      if (paidPayment) {
        return res.redirect(`/views/user/checkout-success.html?orderId=${encodeURIComponent(paidPayment.rentalOrder.toString())}&payment=vnpay`);
      }

      return res.redirect("/views/user/orders.html?vnpay=missing");
    }

    const isPaid = verification.isVerified && verification.isSuccess;
    syncPaymentResult(pendingOrder, req.query, isPaid);

    if (!isPaid || Number(verification.vnp_Amount) !== Number(pendingOrder.amount)) {
      await PendingVnpayOrder.deleteOne({ _id: pendingOrder._id });
      return res.redirect("/views/user/orders.html?vnpay=failed");
    }

    const orderId = await completePendingOrderPayment(pendingOrder, req.query);
    await PendingVnpayOrder.deleteOne({ _id: pendingOrder._id });

    const redirectPath = `/views/user/checkout-success.html?orderId=${encodeURIComponent(orderId.toString())}&payment=vnpay${pendingOrder.orderSource === "cart" ? "&clearCart=1" : ""}`;

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

    const pendingOrder = await PendingVnpayOrder.findOne({ txnRef: req.query.vnp_TxnRef });

    if (!pendingOrder) {
      const paidPayment = await Payment.findOne({
        txnRef: req.query.vnp_TxnRef,
        method: "vnpay",
        status: "paid"
      });

      if (paidPayment) {
        return res.json(InpOrderAlreadyConfirmed);
      }

      return res.json(IpnOrderNotFound);
    }

    if (Number(verification.vnp_Amount) !== Number(pendingOrder.amount)) {
      return res.json(IpnInvalidAmount);
    }

    if (pendingOrder.status === "paid") {
      return res.json(InpOrderAlreadyConfirmed);
    }

    if (!verification.isSuccess) {
      syncPaymentResult(pendingOrder, req.query, false);
      await pendingOrder.save();
      return res.json(IpnSuccess);
    }

    syncPaymentResult(pendingOrder, req.query, true);
    await completePendingOrderPayment(pendingOrder, req.query);
    await PendingVnpayOrder.deleteOne({ _id: pendingOrder._id });
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
