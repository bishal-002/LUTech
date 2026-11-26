
const mongoose = require("mongoose");

const payoutSchema = new mongoose.Schema({
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
  sellerEarningsAmount: {
    type: Number,
    min: 0,
    default: 0,
  },
  recoveryDeduction: {
    type: Number,
    min: 0,
    default: 0,
  },
  refundDeduction: {
    type: Number,
    min: 0,
    default: 0,
  },
  refundedGrossAmount: {
    type: Number,
    min: 0,
    default: 0,
  },
  netAmount: {
    type: Number,
    required: true,
    min: 0,
  },
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
    enum: ["on_hold", "available", "paid", "cancelled"],
    default: "on_hold",
    required: true,
    index: true,
  },
  disputeHold: {
    type: Boolean,
    default: false,
    index: true,
  },
  paymentMethod: {
    type: String,
    enum: ["bank_transfer", "mfs", ""],
    default: "",
  },
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
}, {
  timestamps: true,
  minimize: false,
});

payoutSchema.pre("validate", function () {
  if (
    this.disputeHold &&
    ["available", "paid"].includes(this.status)
  ) {
    const error = new Error(
      "A payout with an active dispute hold cannot be released or marked as paid."
    );
    error.statusCode = 409;
    throw error;
  }
});

payoutSchema.index({ sellerId: 1, createdAt: -1 });
payoutSchema.index({ sellerId: 1, status: 1, eligibleAt: 1 });
payoutSchema.index({ status: 1, eligibleAt: 1 });
payoutSchema.index(
  { transactionReference: 1 },
  { unique: true, sparse: true }
);

module.exports =
  mongoose.models.Payout ||
  mongoose.model("Payout", payoutSchema);
