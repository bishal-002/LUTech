const mongoose = require("mongoose");

const {
  AuditLog,
} = require("../models/AuditLog");

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
  // Resolve the actor type for existing admin integrations.
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
    throw new Error("Invalid audit target ID.");
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

  const [auditRecord] = await AuditLog.create(
    [auditData],
    options
  );

  return auditRecord;
};

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  writeAuditLog,
};