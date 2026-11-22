const mongoose = require("mongoose");

const payoutSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    currency: {
      type: String,
      enum: ["BDT"],
      default: "BDT",
      required: true,
    },

    // Merchandise amount after applicable discounts,
    // excluding shipping fees.
    grossAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    commissionRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    commissionAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Snapshot from the order at checkout.
    holdDays: {
      type: Number,
      required: true,
      min: 0,
      max: 365,
    },

    eligibleAt: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "on_hold",
        "available",
        "paid",
        "cancelled",
      ],
      default: "on_hold",
      required: true,
      index: true,
    },

    // Populated only when an administrator confirms
    // the manual bank/MFS transfer.
    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "mfs", ""],
      default: "",
    },

    // Store only the last four characters, never the
    // complete bank or MFS account number.
    destinationLast4: {
      type: String,
      trim: true,
      default: "",
      maxlength: 4,
    },

    transactionReference: {
      type: String,
      trim: true,
      default: undefined,
      maxlength: 120,
    },

    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    processingNote: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

// ---------------------------------------------
// Indexes
// ---------------------------------------------

payoutSchema.index({
  sellerId: 1,
  createdAt: -1,
});

payoutSchema.index({
  sellerId: 1,
  status: 1,
  eligibleAt: 1,
});

payoutSchema.index({
  status: 1,
  eligibleAt: 1,
});

payoutSchema.index(
  { transactionReference: 1 },
  {
    unique: true,
    sparse: true,
  }
);

module.exports =
  mongoose.models.Payout ||
  mongoose.model("Payout", payoutSchema);