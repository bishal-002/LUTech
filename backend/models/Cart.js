
const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be a whole number.",
      },
    },
  },
  { timestamps: true }
);

cartSchema.index(
  { userId: 1, productId: 1, variantId: 1 },
  { unique: true, name: "unique_user_product_variant" }
);

cartSchema.index({ userId: 1, updatedAt: -1 });

module.exports =
  mongoose.models.Cart || mongoose.model("Cart", cartSchema);
