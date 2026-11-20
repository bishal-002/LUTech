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
// COMMISSION FIELD COMPATIBILITY
// ======================================================

const commissionFieldCompatibility = (
  req,
  res,
  next
) => {
  // ----------------------------------------------
  // REQUEST NORMALIZATION
  // ----------------------------------------------

  if (
    req.method === "PATCH" &&
    req.body &&
    typeof req.body === "object" &&
    !Array.isArray(req.body)
  ) {
    const hasCanonicalField =
      Object.prototype.hasOwnProperty.call(
        req.body,
        "defaultCommissionRate"
      );

    const hasLegacyField =
      Object.prototype.hasOwnProperty.call(
        req.body,
        "commissionRate"
      );

    if (
      hasCanonicalField &&
      hasLegacyField &&
      req.body.defaultCommissionRate !==
        req.body.commissionRate
    ) {
      return res.status(400).json({
        message:
          "defaultCommissionRate and commissionRate cannot contain different values.",
      });
    }

    if (hasCanonicalField) {
      req.body.commissionRate =
        req.body.defaultCommissionRate;

      delete req.body.defaultCommissionRate;
    }
  }

  // ----------------------------------------------
  // RESPONSE NORMALIZATION
  // ----------------------------------------------

  const originalJson = res.json.bind(res);

  res.json = (payload) => {
    if (
      payload &&
      payload.settings &&
      typeof payload.settings === "object"
    ) {
      const settings = payload.settings;

      const commissionRate =
        settings.defaultCommissionRate !== undefined
          ? settings.defaultCommissionRate
          : settings.commissionRate;

      if (commissionRate !== undefined) {
        payload = {
          ...payload,
          settings: {
            ...settings,
            defaultCommissionRate: commissionRate,
            commissionRate,
          },
        };
      }
    }

    return originalJson(payload);
  };

  return next();
};

// ======================================================
// PLATFORM SETTINGS ACCESS CONTROL
// ======================================================

router.use(
  protect,
  adminOnly,
  requireAdminPermission("manage_platform_settings"),
  commissionFieldCompatibility
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