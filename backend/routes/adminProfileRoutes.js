const express = require("express");

const {
  getAdminProfiles,
  getAdminProfileById,
  createAdminProfile,
  updateAdminProfile,
  updateAdminProfileStatus,
} = require("../controllers/adminProfileController");

const {
  updateAdminSecuritySettings,
} = require("../controllers/adminSecurityController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const {
  requireAdminPermission,
} = require("../middleware/adminPermissionMiddleware");

const validateAdminTargetEmail = require(
  "../middleware/validateAdminTargetEmail"
);

const router = express.Router();

// Every endpoint requires:
// 1. A valid login.
// 2. The general admin user role.
// 3. An active AdminProfile.
// 4. The manage_admins permission.

router.use(
  protect,
  adminOnly,
  requireAdminPermission("manage_admins")
);

// GET /api/admin/profiles
router.get("/", getAdminProfiles);

// GET /api/admin/profiles/:id
router.get("/:id", getAdminProfileById);

// POST /api/admin/profiles
router.post(
  "/",
  validateAdminTargetEmail,
  createAdminProfile
);

// PATCH /api/admin/profiles/:id
router.patch("/:id", updateAdminProfile);

// PATCH /api/admin/profiles/:id/status
router.patch(
  "/:id/status",
  updateAdminProfileStatus
);

// PATCH /api/admin/profiles/:id/security
router.patch(
  "/:id/security",
  updateAdminSecuritySettings
);

module.exports = router;