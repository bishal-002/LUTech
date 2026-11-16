
const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
      min: [1, "Cart quantity must be at least 1."],
      validate: {
        validator: Number.isInteger,
        message: "Cart quantity must be a whole number.",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Ensure the selected variant belongs to the selected product.
cartSchema.pre("validate", async function () {
  if (!this.productId || !this.variantId) {
    return;
  }

  const Product = mongoose.model("Product");

  const product = await Product.findOne({
    _id: this.productId,
    "variants._id": this.variantId,
  })
    .select("_id")
    .lean();

  if (!product) {
    this.invalidate(
      "variantId",
      "The selected variant does not belong to this product."
    );
  }
});

// One cart entry per user, product and variant.
cartSchema.index(
  {
    userId: 1,
    productId: 1,
    variantId: 1,
  },
  {
    unique: true,
    name: "unique_user_product_variant",
  }
);

// Useful when retrieving all cart items for a user.
cartSchema.index({ userId: 1, updatedAt: -1 });

module.exports =
  mongoose.models.Cart ||
  mongoose.model("Cart", cartSchema);
