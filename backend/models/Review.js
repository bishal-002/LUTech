
const mongoose = require("mongoose");

const REVIEW_STATUSES = [
  "pending",
  "approved",
  "rejected",
];

const reviewSchema = new mongoose.Schema(
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

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "Rating must be a whole number from 1 to 5.",
      },
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },

    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 3000,
    },

    status: {
      type: String,
      enum: REVIEW_STATUSES,
      default: "pending",
      required: true,
      index: true,
    },

    moderation: {
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      reviewedAt: {
        type: Date,
        default: null,
      },

      rejectionReason: {
        type: String,
        trim: true,
        default: "",
        maxlength: 1000,
      },
    },

    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    sellerReply: {
      message: {
        type: String,
        trim: true,
        default: "",
        maxlength: 1500,
      },

      repliedAt: {
        type: Date,
        default: null,
      },
    },

    editedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// A customer can review a purchased product only once
// for a particular order.
reviewSchema.index(
  {
    customerId: 1,
    orderId: 1,
    productId: 1,
  },
  {
    unique: true,
    name: "unique_customer_order_product_review",
  }
);

// Efficient product review listing.
reviewSchema.index({
  productId: 1,
  status: 1,
  createdAt: -1,
});

// Efficient seller review listing.
reviewSchema.index({
  sellerId: 1,
  status: 1,
  createdAt: -1,
});

// Efficient customer review history.
reviewSchema.index({
  customerId: 1,
  createdAt: -1,
});

// Moderation queue.
reviewSchema.index({
  status: 1,
  createdAt: 1,
});

// Expose constants to controllers and services.
reviewSchema.statics.REVIEW_STATUSES = REVIEW_STATUSES;

module.exports =
  mongoose.models.Review ||
  mongoose.model("Review", reviewSchema);
