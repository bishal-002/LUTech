
const express = require("express");

const {
  getAuditLogs,
  getAuditLogById,
} = require("../controllers/auditLogController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const {
  requireAdminPermission,
} = require("../middleware/adminPermissionMiddleware");

const router = express.Router();

// All audit endpoints require explicit permission.
router.use(
  protect,
  adminOnly,
  requireAdminPermission("view_audit_logs")
);

// GET /api/admin/audit-logs
router.get("/", getAuditLogs);

// GET /api/admin/audit-logs/:id
router.get("/:id", getAuditLogById);

module.exports = router;
