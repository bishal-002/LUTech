
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
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    twoFactorMethod: {
      type: String,
      enum: ["authenticator_app", "email_otp"],
      default: undefined,
    },

    // Store only encrypted authenticator secrets.
    // Encryption/decryption will be implemented separately.
    twoFactorSecretEncrypted: {
      type: String,
      default: undefined,
      select: false,
    },

    allowedIps: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 64,
        },
      ],
      default: [],
    },

    passwordChangedAt: {
      type: Date,
      default: Date.now,
    },

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
    // Link to the existing User document.
    // Do not duplicate login credentials here.
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
