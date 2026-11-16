
const mongoose = require("mongoose");

const sellerApplicationSchema = new mongoose.Schema(
  {
    reason: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    reviewNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // Basic account information
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address.",
      ],
    },

    password: {
      type: String,
      required: true,
    },

    // Account role
    role: {
      type: String,
      enum: ["customer", "seller", "admin"],
      default: "customer",
      required: true,
    },

    // Seller approval status
    sellerStatus: {
      type: String,
      enum: ["not_applicable", "pending", "approved", "rejected"],
      default: "not_applicable",
    },

    // OTP verification
    otp: {
      type: String,
      default: undefined,
      select: false,
    },

    otpExpires: {
      type: Date,
      default: undefined,
      select: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    // Customer address
    address: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    // Seller store information
    storeName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    storeDescription: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    storePhone: {
      type: String,
      trim: true,
      maxlength: 25,
      default: "",
    },

    storeAddress: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    // Legacy embedded seller application information.
    // Retained for compatibility with existing controllers.
    sellerApplication: {
      type: sellerApplicationSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Normalize account information before validation.
userSchema.pre("validate", function () {
  if (this.name) {
    this.name = this.name.trim();
  }

  if (this.email) {
    this.email = this.email.trim().toLowerCase();
  }

  if (this.storeName) {
    this.storeName = this.storeName.trim();
  }
});

// Useful indexes for seller and admin management.
userSchema.index({ role: 1, sellerStatus: 1 });
userSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.User ||
  mongoose.model("User", userSchema);
