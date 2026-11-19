
const express = require("express");

const {
  getProductsForModeration,
  approveProduct,
  rejectProduct,
  verifyGenuineProduct,
  suspendProduct,
} = require("../controllers/productModerationController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const {
  requireAdminPermission,
} = require("../middleware/adminPermissionMiddleware");

const router = express.Router();

// All product moderation endpoints require an active
// administrator profile and the appropriate permission.
router.use(protect, adminOnly);

// List products awaiting review.
router.get(
  "/",
  requireAdminPermission("approve_products"),
  getProductsForModeration
);

// Approve a pending product.
router.patch(
  "/:id/approve",
  requireAdminPermission("approve_products"),
  approveProduct
);

// Reject a pending product.
router.patch(
  "/:id/reject",
  requireAdminPermission("approve_products"),
  rejectProduct
);

// Grant genuine verification.
router.patch(
  "/:id/verify-genuine",
  requireAdminPermission("verify_genuine_badge"),
  verifyGenuineProduct
);

// Suspend an approved product.
router.patch(
  "/:id/suspend",
  requireAdminPermission("suspend_products"),
  suspendProduct
);

module.exports = router;
