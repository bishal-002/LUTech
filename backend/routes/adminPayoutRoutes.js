const express = require("express");

const {
  getAdminPayoutSummary,
  getAdminPayouts,
  getAdminPayoutDetails,
  processPayout,
} = require("../controllers/adminPayoutController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const {
  requireAdminPermission,
} = require("../middleware/adminPermissionMiddleware");

const router = express.Router();

// All payout administration requires:
// 1. Valid JWT
// 2. Administrator role
// 3. process_payouts permission
// 4. Enabled administrator 2FA

router.use(
  protect,
  adminOnly,
  requireAdminPermission("process_payouts")
);

// Keep static routes before /:id.
router.get(
  "/summary",
  getAdminPayoutSummary
);

router.get(
  "/",
  getAdminPayouts
);

router.get(
  "/:id",
  getAdminPayoutDetails
);

router.put(
  "/:id/process",
  processPayout
);

module.exports = router;