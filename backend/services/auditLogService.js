const mongoose = require("mongoose");

const { AuditLog } = require("../models/AuditLog");
const AdminProfile = require("../models/AdminProfile");

const ADMIN_METRIC_BY_ACTION = Object.freeze({
  SELLER_KYC_APPROVED: "metrics.sellersReviewed",
  SELLER_KYC_REJECTED: "metrics.sellersReviewed",
  PRODUCT_APPROVED: "metrics.productsModerated",
  PRODUCT_REJECTED: "metrics.productsModerated",
  PRODUCT_SUSPENDED: "metrics.productsModerated",
  PRODUCT_VERIFIED_GENUINE: "metrics.productsModerated",
  DISPUTE_RESOLVED: "metrics.disputesResolved",
  DISPUTE_REJECTED: "metrics.disputesResolved",
});

const incrementAdminActivityMetric = async ({
  adminId,
  actorRole,
  action,
  session,
}) => {
  const metricPath = ADMIN_METRIC_BY_ACTION[action];

  if (!metricPath) return;

  if (actorRole !== "admin") {
    throw new Error(`Audit action ${action} requires an administrator actor.`);
  }

  if (!mongoose.isValidObjectId(adminId)) {
    throw new Error("A valid administrator ID is required for metric updates.");
  }

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
      $inc: { [metricPath]: 1 },
    },
    { session }
  );

  if (result.matchedCount !== 1) {
    throw new Error(
      "The active administrator profile was not found. Activity metric could not be updated."
    );
  }
};

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
  if (!actorRole && adminId) actorRole = "admin";

  if (!actorRole) {
    throw new Error("An audit actor role is required.");
  }

  if (actorRole === "admin") {
    if (!mongoose.isValidObjectId(adminId)) {
      throw new Error("Invalid audit administrator ID.");
    }

    actorId = actorId || adminId;
  }

  if (["seller", "customer"].includes(actorRole)) {
    if (!mongoose.isValidObjectId(actorId)) {
      throw new Error(`Invalid audit ${actorRole} ID.`);
    }

    adminId = null;
  }

  if (actorRole === "system") {
    adminId = null;
    actorId = null;
  }

  if (!mongoose.isValidObjectId(targetId)) {
    throw new Error("Invalid audit target ID.");
  }

  if (
    changes === null ||
    typeof changes !== "object" ||
    Array.isArray(changes)
  ) {
    throw new Error("Audit changes must be an object.");
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
  const [auditRecord] = await AuditLog.create([auditData], options);

  await incrementAdminActivityMetric({
    adminId,
    actorRole,
    action,
    session,
  });

  return auditRecord;
};

module.exports = {
  writeAuditLog,
};