
const express = require("express");

const {
  getReviewsForModeration,
  approveReview,
  rejectReview,
} = require("../controllers/reviewModerationController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const {
  requireAdminPermission,
} = require("../middleware/adminPermissionMiddleware");

const router = express.Router();

// Every endpoint requires an authenticated administrator.
router.use(protect, adminOnly);

// View and filter reviews awaiting moderation.
router.get(
  "/",
  requireAdminPermission("view_reviews"),
  getReviewsForModeration
);

// Approve a pending review.
router.patch(
  "/:id/approve",
  requireAdminPermission("moderate_reviews"),
  approveReview
);

// Reject a pending review. The controller enforces a rejection note.
router.patch(
  "/:id/reject",
  requireAdminPermission("moderate_reviews"),
  rejectReview
);

module.exports = router;
