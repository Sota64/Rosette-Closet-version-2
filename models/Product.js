const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
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
    },
    sizes: {
      type: [
        {
          type: String,
          enum: ["XS", "S", "M", "L", "XL", "XXL"]
        }
      ],
      required: true,
      validate: {
        validator(sizes) {
          return sizes.length > 0;
        },
        message: "Product must have at least one size"
      }
    },
    color: {
      type: String,
      required: true,
      trim: true
    },
    images: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ["available", "rented", "maintenance", "outofstock"],
      default: "available"
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true
    }
  },
  {
    timestamps: true
  }
);

productSchema.pre("save", function generateCode(next) {
  if (!this.code) {
    this.code = `RC-${this._id.toString().slice(-6).toUpperCase()}`;
  }

  next();
});

module.exports = mongoose.model("Product", productSchema);
