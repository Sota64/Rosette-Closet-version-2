const mongoose = require("mongoose");

const pendingVnpayOrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    size: String,
    quantity: {
      type: Number,
      min: 1,
      default: 1
    },
    rentalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    deposit: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    _id: false
  }
);

const pendingVnpayOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    txnRef: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    orderPayload: {
      startDate: {
        type: Date,
        required: true
      },
      returnDate: {
        type: Date,
        required: true
      },
      totalAmount: {
        type: Number,
        required: true,
        min: 0
      },
      items: {
        type: [pendingVnpayOrderItemSchema],
        required: true
      }
    },
    orderSource: {
      type: String,
      enum: ["direct", "cart"],
      default: "direct"
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending"
    },
    rentalOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentalOrder"
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

module.exports = mongoose.model("PendingVnpayOrder", pendingVnpayOrderSchema);
