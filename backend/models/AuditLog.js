const mongoose = require("mongoose");

// ======================================================
// AUDIT ACTIONS
// ======================================================

const AUDIT_ACTIONS = [
  // Seller verification
  "SELLER_KYC_APPROVED",
  "SELLER_KYC_REJECTED",
  "SELLER_TIER_UPGRADED",

  // Product moderation
  "PRODUCT_VERIFIED_GENUINE",
  "PRODUCT_SUSPENDED",
  "PRODUCT_APPROVED",
  "PRODUCT_REJECTED",

  // Catalog management
  "CATEGORY_SCHEMA_UPDATED",

  // Finance and disputes
  "PAYOUT_RELEASED",
  "DISPUTE_RESOLVED",
  "MANUAL_REFUND_ISSUED",

  // Administrator management
  "ADMIN_PROFILE_CREATED",
  "ADMIN_PROFILE_UPDATED",
  "ADMIN_PERMISSIONS_UPDATED",
  "ADMIN_PROFILE_DOWNGRADED",
  "ADMIN_PROFILE_ACTIVATED",
  "ADMIN_PROFILE_SUSPENDED",
  "ADMIN_PROFILE_REVOKED",

  // Administrator security
  "ADMIN_SECURITY_SETTINGS_UPDATED",
  "ADMIN_2FA_ENABLED",
  "ADMIN_2FA_DISABLED",
  "ADMIN_PASSWORD_CHANGED",

  // Platform configuration
  "PLATFORM_SETTINGS_UPDATED",
];

// ======================================================
// TARGET TYPES
// ======================================================

const AUDIT_TARGET_TYPES = [
  "AdminProfile",
  "Seller",
  "Product",
  "User",
  "Order",
  "Category",
  "Payout",
  "PlatformSettings",
];

// ======================================================
// ACTIONS THAT REQUIRE AN INTERNAL NOTE
// ======================================================

const NOTE_REQUIRED_ACTIONS = [
  "SELLER_KYC_REJECTED",
  "PRODUCT_SUSPENDED",
  "PRODUCT_REJECTED",
  "ADMIN_PROFILE_SUSPENDED",
  "ADMIN_PROFILE_REVOKED",
  "ADMIN_PROFILE_DOWNGRADED",
  "ADMIN_2FA_DISABLED",
  "MANUAL_REFUND_ISSUED",
  "PLATFORM_SETTINGS_UPDATED",
];

// ======================================================
// AUDIT LOG SCHEMA
// ======================================================

const auditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },

    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
      immutable: true,
    },

    targetType: {
      type: String,
      enum: AUDIT_TARGET_TYPES,
      required: true,
      immutable: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      immutable: true,
    },

    changes: {
      before: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
        immutable: true,
      },

      after: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
        immutable: true,
      },
    },

    note: {
      type: String,
      trim: true,
      maxlength: 500,
      required: function () {
        return NOTE_REQUIRED_ACTIONS.includes(this.action);
      },
      immutable: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
      required: true,
    },
  },
  {
    minimize: false,
    timestamps: false,
  }
);

// ======================================================
// INDEXES
// ======================================================

auditLogSchema.index({
  adminId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  targetType: 1,
  targetId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  action: 1,
  createdAt: -1,
});

// ======================================================
// PREVENT RECORD MODIFICATION
// ======================================================

auditLogSchema.pre("save", function () {
  if (!this.isNew) {
    throw new Error("Audit log records cannot be modified.");
  }
});

const blockAuditMutation = function () {
  throw new Error(
    "Audit log records cannot be updated or deleted."
  );
};

[
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "replaceOne",
  "findOneAndReplace",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
].forEach((operation) => {
  auditLogSchema.pre(operation, blockAuditMutation);
});

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  AuditLog:
    mongoose.models.AuditLog ||
    mongoose.model("AuditLog", auditLogSchema),

  AUDIT_ACTIONS,
  AUDIT_TARGET_TYPES,
  NOTE_REQUIRED_ACTIONS,
};