const express = require("express");

const {
  getSellerRecoveries,
} = require("../controllers/sellerRecoveryController");

const {
  protect,
  sellerOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, sellerOnly);

// View refund recovery deductions and outstanding balances.
router.get("/", getSellerRecoveries);

module.exports = router;