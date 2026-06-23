const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    rentalOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentalOrder",
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    method: {
      type: String,
      enum: ["vnpay", "cash_on_delivery"],
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending"
    },
    txnRef: {
      type: String,
      trim: true,
      index: true
    },
    transactionNo: {
      type: String,
      trim: true
    },
    bankCode: {
      type: String,
      trim: true
    },
    responseCode: {
      type: String,
      trim: true
    },
    payDate: {
      type: String,
      trim: true
    },
    secureHash: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Payment", paymentSchema);
