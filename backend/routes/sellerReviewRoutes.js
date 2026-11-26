
const express = require("express");

const {
  getSellerReviews,
} = require("../controllers/reviewController");

const {
  protect,
  sellerOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, sellerOnly);

router.get(
  "/",
  getSellerReviews
);

module.exports = router;
