const mongoose = require("mongoose");

// ======================================================
// PLATFORM SETTINGS SCHEMA
// One global settings document is maintained.
// ======================================================

const platformSettingsSchema = new mongoose.Schema(
  {
    settingKey: {
      type: String,
      enum: ["global"],
      default: "global",
      required: true,
      unique: true,
      immutable: true,
    },

    // Default platform commission percentage.
    commissionRate: {
      type: Number,
      default: 5,
      min: 0,
      max: 100,
      validate: {
        validator: (value) =>
          Number.isFinite(value) &&
          Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
        message:
          "Commission rate can have a maximum of two decimal places.",
      },
    },

    // Product moderation default.
    autoApproveProducts: {
      type: Boolean,
      default: false,
    },

    // Maximum order amount permitted for Cash on Delivery.
    // Amounts are stored in BDT.
    codMaxOrderAmount: {
      type: Number,
      default: 50000,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: "COD maximum order amount must be a positive whole number.",
      },
    },

    // Maximum refused COD deliveries before applying restrictions.
    maxRefusedCodAllowed: {
      type: Number,
      default: 2,
      min: 1,
      max: 100,
      validate: {
        validator: Number.isSafeInteger,
        message:
          "Maximum refused COD orders must be a whole number between 1 and 100.",
      },
    },

    // Payout hold period in days.
    payoutHoldDays: {
      type: Number,
      default: 7,
      min: 0,
      max: 365,
      validate: {
        validator: Number.isSafeInteger,
        message:
          "Payout hold days must be a whole number between 0 and 365.",
      },
    },

    // Curated list of active Brand documents.
    masterBrands: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Brand",
        },
      ],
      default: [],
      validate: {
        validator: (brands) =>
          Array.isArray(brands) &&
          brands.length <= 500 &&
          new Set(brands.map((brand) => brand.toString())).size ===
            brands.length,
        message:
          "Master brands must contain unique Brand IDs, with a maximum of 500.",
      },
    },

    // Last administrator who changed the global settings.
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

// ======================================================
// INDEXES
// ======================================================

platformSettingsSchema.index(
  { settingKey: 1 },
  { unique: true }
);

// ======================================================
// EXPORT
// ======================================================

module.exports =
  mongoose.models.PlatformSettings ||
  mongoose.model("PlatformSettings", platformSettingsSchema);