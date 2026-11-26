const express = require("express");

const {
  getAdminRefunds,
  getAdminRefundById,
  completeAdminRefund,
  markAdminRefundFailed,
} = require("../controllers/refundController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const {
  requireAdminPermission,
} = require("../middleware/adminPermissionMiddleware");

const router = express.Router();

router.use(protect, adminOnly);

// List approved, completed and failed refunds.
router.get(
  "/",
  requireAdminPermission("issue_refunds"),
  getAdminRefunds
);

// View refund details and the customer's refund destination.
router.get(
  "/:id",
  requireAdminPermission("issue_refunds"),
  getAdminRefundById
);

// Record a manually completed bank/MFS transfer.
router.patch(
  "/:id/complete",
  requireAdminPermission("issue_refunds"),
  completeAdminRefund
);

// Record a failed transfer so it can be retried.
router.patch(
  "/:id/fail",
  requireAdminPermission("issue_refunds"),
  markAdminRefundFailed
);

module.exports = router;