
const mongoose = require("mongoose");

const {
  ADMIN_ROLES,
  ADMIN_PERMISSIONS,
} = require("../config/adminPermissions");

// ======================================================
// ADMIN SECURITY SUB-SCHEMA
// ======================================================

const adminSecuritySchema = new mongoose.Schema(
  {
    // Two-factor authentication status.
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    twoFactorMethod: {
      type: String,
      enum: ["authenticator_app", "email_otp"],
      default: undefined,
    },

    // Encrypted active authenticator secret.
    twoFactorSecretEncrypted: {
      type: String,
      default: undefined,
      select: false,
    },

    // Pending enrollment.
    twoFactorPendingMethod: {
      type: String,
      enum: ["authenticator_app", "email_otp"],
      default: undefined,
      select: false,
    },

    twoFactorPendingSecretEncrypted: {
      type: String,
      default: undefined,
      select: false,
    },

    twoFactorSetupExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    twoFactorSetupOtpHash: {
      type: String,
      default: undefined,
      select: false,
    },

    twoFactorSetupOtpAttempts: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },

    // One-time login challenge.
    twoFactorChallengeId: {
      type: String,
      default: undefined,
      select: false,
    },

    twoFactorChallengeExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    twoFactorChallengeAttempts: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },

    // Email OTP used during administrator login.
    twoFactorLoginOtpHash: {
      type: String,
      default: undefined,
      select: false,
    },

    twoFactorLoginOtpExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    twoFactorLoginOtpAttempts: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },

    twoFactorLoginOtpSentAt: {
      type: Date,
      default: null,
      select: false,
    },

    twoFactorLoginOtpSendCount: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },

    twoFactorLoginOtpWindowStart: {
      type: Date,
      default: null,
      select: false,
    },

    // Email OTP used when disabling email-based 2FA.
    twoFactorDisableOtpHash: {
      type: String,
      default: undefined,
      select: false,
    },

    twoFactorDisableOtpExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    twoFactorDisableOtpAttempts: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },

    // IP whitelist.
    allowedIps: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 64,
        },
      ],
      default: [],
      validate: {
        validator: (items) =>
          Array.isArray(items) && items.length <= 20,
        message: "A maximum of 20 allowed IP rules is permitted.",
      },
    },

    // Password/session security.
    passwordChangedAt: {
      type: Date,
      default: Date.now,
    },

    // Last successful administrator login metadata.
    lastLoginIp: {
      type: String,
      trim: true,
      default: "",
      maxlength: 64,
    },

    lastUserAgent: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
  },
  {
    _id: false,
  }
);

// ======================================================
// ADMIN METRICS SUB-SCHEMA
// ======================================================

const adminMetricsSchema = new mongoose.Schema(
  {
    sellersReviewed: {
      type: Number,
      default: 0,
      min: 0,
    },

    productsModerated: {
      type: Number,
      default: 0,
      min: 0,
    },

    disputesResolved: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

// ======================================================
// MAIN ADMIN PROFILE SCHEMA
// ======================================================

const adminProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    adminRole: {
      type: String,
      enum: ADMIN_ROLES,
      required: true,
    },

    permissions: {
      type: [
        {
          type: String,
          enum: ADMIN_PERMISSIONS,
        },
      ],
      default: [],
      validate: {
        validator: (permissions) =>
          new Set(permissions).size === permissions.length,
        message: "Duplicate admin permissions are not allowed.",
      },
    },

    department: {
      type: String,
      enum: [
        "Operations",
        "Trust & Safety",
        "Catalog & Merchandising",
        "Finance",
        "Engineering",
      ],
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "suspended", "revoked"],
      default: "active",
      required: true,
      index: true,
    },

    security: {
      type: adminSecuritySchema,
      default: () => ({}),
    },

    metrics: {
      type: adminMetricsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

// ======================================================
// VALIDATION
// ======================================================

adminProfileSchema.pre("validate", function () {
  const security = this.security;

  if (!security) return;

  if (security.twoFactorEnabled && !security.twoFactorMethod) {
    this.invalidate(
      "security.twoFactorMethod",
      "A two-factor authentication method is required when 2FA is enabled."
    );
  }

  if (
    security.twoFactorEnabled &&
    security.twoFactorMethod === "authenticator_app" &&
    !security.twoFactorSecretEncrypted
  ) {
    this.invalidate(
      "security.twoFactorSecretEncrypted",
      "An encrypted authenticator secret is required."
    );
  }

  if (
    security.twoFactorEnabled &&
    security.twoFactorPendingMethod
  ) {
    this.invalidate(
      "security.twoFactorPendingMethod",
      "A pending enrollment cannot exist while 2FA is enabled."
    );
  }
});

// ======================================================
// INDEXES
// ======================================================

adminProfileSchema.index({
  adminRole: 1,
  status: 1,
});

// ======================================================
// EXPORT
// ======================================================

module.exports =
  mongoose.models.AdminProfile ||
  mongoose.model("AdminProfile", adminProfileSchema);
