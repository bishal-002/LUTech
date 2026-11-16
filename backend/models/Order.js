
const mongoose = require("mongoose");

// ---------------------------------------------
// Historical product snapshot
// ---------------------------------------------
const productSnapshotSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    attributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    image: {
      type: String,
      default: "",
      trim: true,
    },

    brand: {
      type: String,
      default: "",
      trim: true,
    },

    condition: {
      type: String,
      default: "new_sealed",
    },
  },
  { _id: false }
);

// ---------------------------------------------
// Order item schema
// ---------------------------------------------
const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // Historical product information
    snapshot: {
      type: productSnapshotSchema,
      required: true,
    },

    // Legacy fields retained for compatibility
    name: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    image: {
      type: String,
      default: "",
    },

    // Price and quantity at the time of purchase
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Order quantity must be a whole number.",
      },
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

// ---------------------------------------------
// Main order schema
// ---------------------------------------------
const orderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) =>
          Array.isArray(items) && items.length > 0,
        message: "An order must contain at least one item.",
      },
    },

    // Shipping information
    shippingName: {
      type: String,
      required: true,
      trim: true,
    },

    shippingPhone: {
      type: String,
      required: true,
      trim: true,
    },

    shippingAddress: {
      type: String,
      required: true,
      trim: true,
    },

    // Financial breakdown
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    shippingFee: {
      type: Number,
      min: 0,
      default: 0,
    },

    discount: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // COD payment configuration
    paymentMethod: {
      type: String,
      enum: ["COD"],
      default: "COD",
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
      required: true,
    },

    // Order lifecycle
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ---------------------------------------------
// Synchronize item snapshots and calculate totals
// ---------------------------------------------
orderSchema.pre("validate", function () {
  let calculatedSubtotal = 0;

  this.items.forEach((item) => {
    // Keep old price and new unitPrice synchronized.
    if (
      item.unitPrice === undefined ||
      item.unitPrice === null
    ) {
      item.unitPrice = item.price;
    }

    if (
      item.price === undefined ||
      item.price === null
    ) {
      item.price = item.unitPrice;
    }

    // Preserve the historical item name and image.
    if (!item.snapshot && item.name) {
      item.snapshot = {
        title: item.name,
        sku: "LEGACY-UNKNOWN",
        attributes: {},
        image: item.image || "",
      };
    }

    if (item.snapshot) {
      if (!item.snapshot.title && item.name) {
        item.snapshot.title = item.name;
      }

      if (!item.name && item.snapshot.title) {
        item.name = item.snapshot.title;
      }

      if (!item.snapshot.image && item.image) {
        item.snapshot.image = item.image;
      }

      if (!item.image && item.snapshot.image) {
        item.image = item.snapshot.image;
      }
    }

    // Calculate each item's subtotal.
    if (
      item.unitPrice !== undefined &&
      item.unitPrice !== null &&
      item.quantity
    ) {
      item.subtotal = item.unitPrice * item.quantity;
      calculatedSubtotal += item.subtotal;
    }
  });

  // Calculate order-level totals.
  this.subtotal = calculatedSubtotal;

  const shippingFee = this.shippingFee || 0;
  const discount = this.discount || 0;

  if (discount > calculatedSubtotal + shippingFee) {
    this.invalidate(
      "discount",
      "Discount cannot exceed the order amount."
    );
  }

  this.totalAmount =
    calculatedSubtotal + shippingFee - discount;
});

// ---------------------------------------------
// Indexes for order queries
// ---------------------------------------------
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ sellerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports =
  mongoose.models.Order ||
  mongoose.model("Order", orderSchema);
