const express = require("express");

const {
  getSellerPayoutDetails,
  updateSellerPayoutDetails,
  getSellerPayoutSummary,
  getSellerPayoutHistory,
} = require("../controllers/payoutController");

const {
  protect,
  sellerOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, sellerOnly);

router.get(
  "/summary",
  getSellerPayoutSummary
);

router.get(
  "/history",
  getSellerPayoutHistory
);

router.get(
  "/details",
  getSellerPayoutDetails
);

router.put(
  "/details",
  updateSellerPayoutDetails
);

module.exports = router;