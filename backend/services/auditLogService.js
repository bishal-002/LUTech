
const mongoose = require("mongoose");

const {
  AuditLog,
} = require("../models/AuditLog");

// ======================================================
// WRITE AUDIT LOG
// ======================================================

const writeAuditLog = async ({
  adminId,
  action,
  targetType,
  targetId,
  changes = {},
  note,
  session = null,
}) => {
  // Validate administrator ID.
  if (!mongoose.isValidObjectId(adminId)) {
    throw new Error("Invalid audit administrator ID.");
  }

  // Validate target ID.
  if (!mongoose.isValidObjectId(targetId)) {
    throw new Error("Invalid audit target ID.");
  }

  // Validate changes object.
  if (
    changes === null ||
    typeof changes !== "object" ||
    Array.isArray(changes)
  ) {
    throw new Error("Audit changes must be an object.");
  }

  // Construct audit record.
  const auditData = {
    adminId,
    action,
    targetType,
    targetId,
    changes,
  };

  if (note !== undefined && note !== null) {
    auditData.note = String(note).trim();
  }

  // Create the record, optionally within a transaction.
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
