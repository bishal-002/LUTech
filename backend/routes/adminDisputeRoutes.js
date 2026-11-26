const express = require("express");

const {
  getAdminDisputes,
  getAdminDisputeById,
  addDisputeMessage,
  updateAdminDisputeStatus,
  resolveAdminDispute,
} = require("../controllers/disputeController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const {
  requireAdminPermission,
} = require("../middleware/adminPermissionMiddleware");

const router = express.Router();

router.use(protect, adminOnly);

// View and manage all disputes.
router.get(
  "/",
  requireAdminPermission("manage_disputes"),
  getAdminDisputes
);

// View a dispute, its messages and associated refund.
router.get(
  "/:id",
  requireAdminPermission("manage_disputes"),
  getAdminDisputeById
);

// Participate in the dispute conversation.
router.post(
  "/:id/messages",
  requireAdminPermission("manage_disputes"),
  addDisputeMessage
);

// Update the case workflow status.
router.patch(
  "/:id/status",
  requireAdminPermission("manage_disputes"),
  updateAdminDisputeStatus
);

// Make a final decision. Refund decisions also require issue_refunds.
router.post(
  "/:id/resolve",
  requireAdminPermission("resolve_disputes"),
  resolveAdminDispute
);

module.exports = router;