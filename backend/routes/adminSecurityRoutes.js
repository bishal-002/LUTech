
const express = require("express");

const {
  startTwoFactorSetup,
  enableTwoFactor,
  requestDisableTwoFactor,
  disableTwoFactor,
  changeAdminPassword,
} = require("../controllers/adminSecurityController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require an authenticated administrator.
router.use(protect, adminOnly);

// Two-factor enrollment.
router.post(
  "/2fa/setup",
  startTwoFactorSetup
);

router.post(
  "/2fa/enable",
  enableTwoFactor
);

// Two-factor disable.
router.post(
  "/2fa/disable/request",
  requestDisableTwoFactor
);

router.post(
  "/2fa/disable",
  disableTwoFactor
);

// Administrator password management.
router.patch(
  "/password",
  changeAdminPassword
);

module.exports = router;
