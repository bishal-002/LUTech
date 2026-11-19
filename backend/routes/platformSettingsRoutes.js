const express = require("express");

const {
  getPlatformSettings,
  updatePlatformSettings,
} = require("../controllers/platformSettingsController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const {
  requireAdminPermission,
} = require("../middleware/adminPermissionMiddleware");

const router = express.Router();

// ======================================================
// PLATFORM SETTINGS ACCESS CONTROL
// ======================================================

router.use(
  protect,
  adminOnly,
  requireAdminPermission("manage_platform_settings")
);

// ======================================================
// GET GLOBAL PLATFORM SETTINGS
// GET /api/admin/platform-settings
// ======================================================

router.get("/", getPlatformSettings);

// ======================================================
// UPDATE GLOBAL PLATFORM SETTINGS
// PATCH /api/admin/platform-settings
// ======================================================

router.patch("/", updatePlatformSettings);

module.exports = router;