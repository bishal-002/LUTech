
const mongoose = require("mongoose");

const sellerRecoverySchema = new mongoose.Schema({
  refundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Refund",
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
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
    index: true,
  },
  originalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  remainingAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  recoveredAmount: {
    type: Number,
    min: 0,
    default: 0,
  },
  status: {
    type: String,
    enum: ["pending", "partially_recovered", "recovered"],
    default: "pending",
    required: true,
    index: true,
  },
  lastPayoutId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Payout",
    default: null,
  },
  recoveredAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  minimize: false,
});

sellerRecoverySchema.index({
  sellerId: 1,
  status: 1,
  createdAt: 1,
});

module.exports =
  mongoose.models.SellerRecovery ||
  mongoose.model("SellerRecovery", sellerRecoverySchema);
