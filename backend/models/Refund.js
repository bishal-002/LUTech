
const mongoose = require("mongoose");

const refundDestinationSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ["bank_transfer", "mfs"],
    required: true,
  },
  bankName: { type: String, trim: true, maxlength: 100, default: "" },
  branchName: { type: String, trim: true, maxlength: 100, default: "" },
  routingNumber: { type: String, trim: true, maxlength: 40, default: "" },
  accountHolderName: { type: String, trim: true, maxlength: 120, default: "" },
  accountNumber: { type: String, default: undefined },
  mfsProvider: {
    type: String,
    enum: ["bKash", "Nagad", "Rocket", ""],
    default: "",
  },
  mfsAccountType: {
    type: String,
    enum: ["Merchant", "Personal", ""],
    default: "",
  },
  mfsNumber: { type: String, default: undefined },
  destinationLast4: { type: String, trim: true, maxlength: 4, default: "" },
}, { _id: false });

const refundSchema = new mongoose.Schema({
  disputeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Dispute",
    required: true,
    unique: true,
    index: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
    unique: true,
    index: true,
  },
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
  currency: {
    type: String,
    enum: ["BDT"],
    default: "BDT",
    required: true,
  },
  requestedAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  approvedAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  sellerRecoveryAmount: {
    type: Number,
    min: 0,
    default: 0,
  },
  commissionReversalAmount: {
    type: Number,
    min: 0,
    default: 0,
  },
  refundDestination: {
    type: refundDestinationSchema,
    default: undefined,
    select: false,
  },
  status: {
    type: String,
    enum: ["approved", "completed", "failed"],
    default: "approved",
    required: true,
    index: true,
  },
  paymentMethod: {
    type: String,
    enum: ["bank_transfer", "mfs", ""],
    default: "",
  },
  transactionReference: {
    type: String,
    trim: true,
    maxlength: 120,
    default: undefined,
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  processedAt: {
    type: Date,
    default: null,
  },
  processingNote: {
    type: String,
    trim: true,
    maxlength: 500,
    default: "",
  },
  failureReason: {
    type: String,
    trim: true,
    maxlength: 500,
    default: "",
  },
}, {
  timestamps: true,
  minimize: false,
});

refundSchema.index({ customerId: 1, createdAt: -1 });
refundSchema.index({ status: 1, createdAt: -1 });
refundSchema.index(
  { transactionReference: 1 },
  { unique: true, sparse: true }
);

module.exports =
  mongoose.models.Refund ||
  mongoose.model("Refund", refundSchema);
