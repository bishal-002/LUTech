
const mongoose = require("mongoose");

const DISPUTE_REASONS = Object.freeze([
  "item_not_received",
  "damaged_item",
  "wrong_item",
  "missing_items",
  "not_as_described",
  "defective_item",
  "suspected_counterfeit",
  "other",
]);

const DISPUTE_STATUSES = Object.freeze([
  "awaiting_seller",
  "under_review",
  "awaiting_customer",
  "resolved",
  "rejected",
  "closed",
]);

const ACTIVE_DISPUTE_STATUSES = Object.freeze([
  "awaiting_seller",
  "under_review",
  "awaiting_customer",
]);

const disputeItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 180,
  },
  sku: {
    type: String,
    trim: true,
    uppercase: true,
    default: "",
    maxlength: 80,
  },
  image: {
    type: String,
    trim: true,
    default: "",
    maxlength: 1000,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    validate: Number.isInteger,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  lineAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  refundableAmount: {
    type: Number,
    required: true,
    min: 0,
  },
}, { _id: false });

const disputeMessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  senderRole: {
    type: String,
    enum: ["customer", "seller", "admin"],
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 2000,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

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

const disputeResolutionSchema = new mongoose.Schema({
  decision: {
    type: String,
    enum: ["refund", "replacement", "rejected"],
    required: true,
  },
  note: {
    type: String,
    trim: true,
    required: true,
    maxlength: 500,
  },
  approvedRefundAmount: {
    type: Number,
    min: 0,
    default: 0,
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  resolvedAt: {
    type: Date,
    required: true,
  },
}, { _id: false });

const disputeSchema = new mongoose.Schema({
  caseNumber: {
    type: String,
    trim: true,
    uppercase: true,
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
  reason: {
    type: String,
    enum: DISPUTE_REASONS,
    required: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 20,
    maxlength: 3000,
  },
  requestedResolution: {
    type: String,
    enum: ["refund", "replacement"],
    required: true,
  },
  items: {
    type: [disputeItemSchema],
    required: true,
    validate: {
      validator: (items) =>
        Array.isArray(items) && items.length >= 1 && items.length <= 50,
      message: "A dispute must contain between 1 and 50 order items.",
    },
  },
  requestedRefundAmount: {
    type: Number,
    min: 0,
    default: 0,
  },
  status: {
    type: String,
    enum: DISPUTE_STATUSES,
    default: "awaiting_seller",
    required: true,
    index: true,
  },
  messages: {
    type: [disputeMessageSchema],
    default: [],
    validate: {
      validator: (messages) =>
        Array.isArray(messages) && messages.length <= 200,
      message: "A dispute can contain a maximum of 200 messages.",
    },
  },
  sellerRespondedAt: {
    type: Date,
    default: null,
  },
  resolution: {
    type: disputeResolutionSchema,
    default: undefined,
  },
  hasRefundDestination: {
    type: Boolean,
    default: false,
  },
  refundDestination: {
    type: refundDestinationSchema,
    default: undefined,
    select: false,
  },
  refundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Refund",
    default: null,
  },
}, {
  timestamps: true,
  minimize: false,
});

disputeSchema.pre("validate", function () {
  if (!this.caseNumber && this.isNew) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const suffix = new mongoose.Types.ObjectId()
      .toString()
      .slice(-6)
      .toUpperCase();

    this.caseNumber = `DSP-${timestamp}-${suffix}`;
  }
});

disputeSchema.index({ customerId: 1, createdAt: -1 });
disputeSchema.index({ sellerId: 1, createdAt: -1 });
disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.statics.DISPUTE_REASONS = DISPUTE_REASONS;
disputeSchema.statics.DISPUTE_STATUSES = DISPUTE_STATUSES;
disputeSchema.statics.ACTIVE_DISPUTE_STATUSES =
  ACTIVE_DISPUTE_STATUSES;

module.exports =
  mongoose.models.Dispute ||
  mongoose.model("Dispute", disputeSchema);

module.exports.DISPUTE_REASONS = DISPUTE_REASONS;
module.exports.DISPUTE_STATUSES = DISPUTE_STATUSES;
module.exports.ACTIVE_DISPUTE_STATUSES = ACTIVE_DISPUTE_STATUSES;
