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
      enum: ["bank_transfer", "cash_on_delivery"],
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Payment", paymentSchema);

