
const mongoose = require("mongoose");

const sellerApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    businessName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    businessDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 25,
    },

    businessAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true,
    },

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
      maxlength: 1000,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// One application record per user.
// A rejected user can resubmit by updating their existing record.
sellerApplicationSchema.index(
  { userId: 1 },
  {
    unique: true,
    name: "unique_seller_application_user",
  }
);

// Useful for admin application review lists.
sellerApplicationSchema.index({
  status: 1,
  createdAt: -1,
});

// Useful for finding applications reviewed by an admin.
sellerApplicationSchema.index({
  reviewedBy: 1,
});

module.exports =
  mongoose.models.SellerApplication ||
  mongoose.model("SellerApplication", sellerApplicationSchema);
