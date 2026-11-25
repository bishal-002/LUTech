
const mongoose = require("mongoose");

// ---------------------------------------------
// MONEY HELPER
// ---------------------------------------------

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

// ---------------------------------------------
// Historical warranty snapshot
// ---------------------------------------------

const productWarrantySnapshotSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      trim: true,
      default: "",
    },

    duration: {
      value: {
        type: Number,
        min: 1,
        default: null,
      },

      unit: {
        type: String,
        enum: ["Days", "Months", "Years", "Lifetime"],
        default: "Months",
      },
    },

    policy: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    startsAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

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

    // Warranty terms are saved at purchase time.
    // Warranty dates are filled when the order is delivered.
    warranty: {
      type: productWarrantySnapshotSchema,
      default: undefined,
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

    snapshot: {
      type: productSnapshotSchema,
      required: true,
    },

    // Legacy fields retained for compatibility.
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
  { _id: false }
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

    // Shipping information.
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

    // -----------------------------------------
    // Financial breakdown
    // -----------------------------------------

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

    // -----------------------------------------
    // Internal seller commission snapshots
    // These fields are not exposed by default.
    // -----------------------------------------

    commissionRateSnapshot: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
      select: false,
    },

    payoutHoldDaysSnapshot: {
      type: Number,
      min: 0,
      max: 365,
      default: null,
      select: false,
    },

    commissionBaseAmount: {
      type: Number,
      min: 0,
      default: 0,
      select: false,
    },

    platformCommissionAmount: {
      type: Number,
      min: 0,
      default: 0,
      select: false,
    },

    sellerNetAmount: {
      type: Number,
      min: 0,
      default: 0,
      select: false,
    },

    // -----------------------------------------
    // DELIVERY INFORMATION
    // -----------------------------------------

    deliveredAt: {
      type: Date,
      default: null,
    },

    // -----------------------------------------
    // REFUSED COD INFORMATION
    // -----------------------------------------

    refusedAt: {
      type: Date,
      default: null,
    },

    // The seller or administrator who recorded
    // the customer refusal.
    refusalRecordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Optional internal delivery/refusal note.
    refusalNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    // -----------------------------------------
    // COD payment configuration
    // -----------------------------------------

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

    // -----------------------------------------
    // Order lifecycle
    // -----------------------------------------

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "refused",
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

    // Preserve historical item name and image.
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
      item.subtotal = roundMoney(
        item.unitPrice * item.quantity
      );

      calculatedSubtotal += item.subtotal;
    }
  });

  // Calculate order totals.
  this.subtotal = roundMoney(calculatedSubtotal);

  const shippingFee = Number(this.shippingFee || 0);
  const discount = Number(this.discount || 0);

  if (
    !Number.isFinite(shippingFee) ||
    shippingFee < 0
  ) {
    this.invalidate(
      "shippingFee",
      "Shipping fee must be a valid non-negative amount."
    );
  }

  if (
    !Number.isFinite(discount) ||
    discount < 0
  ) {
    this.invalidate(
      "discount",
      "Discount must be a valid non-negative amount."
    );
  }

  if (discount > calculatedSubtotal + shippingFee) {
    this.invalidate(
      "discount",
      "Discount cannot exceed the order amount."
    );
  }

  this.totalAmount = roundMoney(
    calculatedSubtotal + shippingFee - discount
  );

  // -------------------------------------------
  // Seller commission calculation
  // -------------------------------------------

  if (
    this.commissionRateSnapshot !== null &&
    this.commissionRateSnapshot !== undefined
  ) {
    const commissionRate = Number(
      this.commissionRateSnapshot
    );

    if (
      !Number.isFinite(commissionRate) ||
      commissionRate < 0 ||
      commissionRate > 100
    ) {
      this.invalidate(
        "commissionRateSnapshot",
        "The commission snapshot must be between 0 and 100."
      );
    }

    const holdDays = Number(
      this.payoutHoldDaysSnapshot
    );

    if (
      !Number.isInteger(holdDays) ||
      holdDays < 0 ||
      holdDays > 365
    ) {
      this.invalidate(
        "payoutHoldDaysSnapshot",
        "Payout hold days must be a whole number between 0 and 365."
      );
    }

    // The commission applies to merchandise after discount.
    // Shipping fees are excluded from seller commission.
    const merchandiseDiscount = Math.min(
      Math.max(0, discount),
      calculatedSubtotal
    );

    const commissionBase = roundMoney(
      Math.max(
        0,
        calculatedSubtotal - merchandiseDiscount
      )
    );

    const commissionAmount = roundMoney(
      commissionBase * (commissionRate / 100)
    );

    const sellerNetAmount = roundMoney(
      commissionBase - commissionAmount
    );

    this.commissionBaseAmount = commissionBase;
    this.platformCommissionAmount = commissionAmount;
    this.sellerNetAmount = sellerNetAmount;
  }
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
