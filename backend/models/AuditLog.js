
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

    "PRODUCT_APPROVED",
    "PRODUCT_REJECTED",
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
];

// ======================================================
// ACTIONS THAT REQUIRE AN INTERNAL NOTE
// ======================================================

const NOTE_REQUIRED_ACTIONS = [
    "SELLER_KYC_REJECTED",
    "PRODUCT_SUSPENDED",
    "ADMIN_PROFILE_SUSPENDED",
    "ADMIN_PROFILE_REVOKED",
    "ADMIN_PROFILE_DOWNGRADED",
    "MANUAL_REFUND_ISSUED",
    "PRODUCT_REJECTED",
];

// ======================================================
// AUDIT LOG SCHEMA
// ======================================================

const auditLogSchema = new mongoose.Schema(
    {
        // Administrator who performed the action.
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            immutable: true,
        },

        // Standardized action identifier.
        action: {
            type: String,
            enum: AUDIT_ACTIONS,
            required: true,
            immutable: true,
        },

        // Type of affected resource.
        targetType: {
            type: String,
            enum: AUDIT_TARGET_TYPES,
            required: true,
            immutable: true,
        },

        // ID of the affected resource.
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            immutable: true,
        },

        // Snapshot of relevant changes.
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

        // Reason or internal note for sensitive actions.
        note: {
            type: String,
            trim: true,
            maxlength: 500,
            required: function () {
                return NOTE_REQUIRED_ACTIONS.includes(this.action);
            },
            immutable: true,
        },

        // Server-generated creation timestamp.
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

// Retrieve an administrator's activity history.
auditLogSchema.index({
    adminId: 1,
    createdAt: -1,
});

// Retrieve activity for a particular resource.
auditLogSchema.index({
    targetType: 1,
    targetId: 1,
    createdAt: -1,
});

// Filter by action type.
auditLogSchema.index({
    action: 1,
    createdAt: -1,
});


// ======================================================
// PREVENT RECORD MODIFICATION
// ======================================================

// Audit records are append-only through the application.
// No update or delete operations are permitted.

// Prevent modification of an existing audit document.
auditLogSchema.pre("save", function () {
    if (!this.isNew) {
        throw new Error(
            "Audit log records cannot be modified."
        );
    }
});

// Prevent query-based updates and deletions.
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
