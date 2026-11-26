
const mongoose = require("mongoose");

const {
  AuditLog,
} = require("../models/AuditLog");

const AdminProfile = require("../models/AdminProfile");

// ======================================================
// ADMIN METRIC ACTION MAPPING
// ======================================================

// Metrics are updated only for successful audited actions.
//
// IMPORTANT:
// These actions must be executed inside a MongoDB transaction.
// The business update, audit log and metric increment must
// either all succeed or all roll back.

const ADMIN_METRIC_BY_ACTION = Object.freeze({
  // Seller reviews.
  SELLER_KYC_APPROVED: "metrics.sellersReviewed",
  SELLER_KYC_REJECTED: "metrics.sellersReviewed",

  // Product moderation.
  PRODUCT_APPROVED: "metrics.productsModerated",
  PRODUCT_REJECTED: "metrics.productsModerated",
  PRODUCT_SUSPENDED: "metrics.productsModerated",
  PRODUCT_VERIFIED_GENUINE: "metrics.productsModerated",
});

// ======================================================
// UPDATE ADMIN ACTIVITY METRIC
// ======================================================

const incrementAdminActivityMetric = async ({
  adminId,
  actorRole,
  action,
  session,
}) => {
  const metricPath =
    ADMIN_METRIC_BY_ACTION[action];

  // No metric is associated with this audit action.
  if (!metricPath) {
    return;
  }

  // These tracked operations must be administrator actions.
  if (actorRole !== "admin") {
    throw new Error(
      `Audit action ${action} requires an administrator actor.`
    );
  }

  if (!mongoose.isValidObjectId(adminId)) {
    throw new Error(
      "A valid administrator ID is required for metric updates."
    );
  }

  // Prevent accidental metric updates outside transactions.
  if (
    !session ||
    typeof session.inTransaction !== "function" ||
    !session.inTransaction()
  ) {
    throw new Error(
      `Audit action ${action} must execute inside a MongoDB transaction.`
    );
  }

  const result = await AdminProfile.updateOne(
    {
      userId: adminId,
      status: "active",
    },
    {
      $inc: {
        [metricPath]: 1,
      },
    },
    {
      session,
    }
  );

  if (result.matchedCount !== 1) {
    throw new Error(
      "The active administrator profile was not found. Activity metric could not be updated."
    );
  }
};

// ======================================================
// WRITE AUDIT LOG
// ======================================================

const writeAuditLog = async ({
  adminId = null,
  actorId = null,
  actorRole = null,
  action,
  targetType,
  targetId,
  changes = {},
  note,
  session = null,
}) => {
  // Resolve actor type for existing admin integrations.
  if (!actorRole && adminId) {
    actorRole = "admin";
  }

  if (!actorRole) {
    throw new Error(
      "An audit actor role is required."
    );
  }

  // Administrator audit entries retain adminId.
  if (actorRole === "admin") {
    if (!mongoose.isValidObjectId(adminId)) {
      throw new Error(
        "Invalid audit administrator ID."
      );
    }

    actorId = actorId || adminId;
  }

  // Seller audit entries use actorId.
  if (
    actorRole === "seller" &&
    !mongoose.isValidObjectId(actorId)
  ) {
    throw new Error(
      "Invalid audit seller ID."
    );
  }

  // System events do not represent a user account.
  if (actorRole === "system") {
    adminId = null;
    actorId = null;
  }

  if (!mongoose.isValidObjectId(targetId)) {
    throw new Error(
      "Invalid audit target ID."
    );
  }

  if (
    changes === null ||
    typeof changes !== "object" ||
    Array.isArray(changes)
  ) {
    throw new Error(
      "Audit changes must be an object."
    );
  }

  const auditData = {
    adminId,
    actorId,
    actorRole,
    action,
    targetType,
    targetId,
    changes,
  };

  if (note !== undefined && note !== null) {
    auditData.note = String(note).trim();
  }

  const options = session ? { session } : {};

  // --------------------------------------------------
  // CREATE AUDIT RECORD
  // --------------------------------------------------

  const [auditRecord] = await AuditLog.create(
    [auditData],
    options
  );

  // --------------------------------------------------
  // UPDATE ADMIN ACTIVITY METRICS
  // --------------------------------------------------

  await incrementAdminActivityMetric({
    adminId,
    actorRole,
    action,
    session,
  });

  return auditRecord;
};

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  writeAuditLog,
};
