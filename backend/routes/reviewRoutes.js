
const express = require("express");

const {
  createReview,
  updateReview,
  getMyReviews,
  getProductReviews,
} = require("../controllers/reviewController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Only customers may submit or manage their own reviews.
const customerOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "customer") {
    return res.status(403).json({
      message: "Customer account required.",
    });
  }

  return next();
};

// Public: approved reviews for a product.
router.get(
  "/product/:productId",
  getProductReviews
);

// All routes below require authentication.
router.use(protect);

// Customer: list their own reviews.
router.get(
  "/my",
  customerOnly,
  getMyReviews
);

// Customer: submit a review for a delivered order.
router.post(
  "/",
  customerOnly,
  createReview
);

// Customer: edit their own review.
router.put(
  "/:id",
  customerOnly,
  updateReview
);

router.patch(
  "/:id",
  customerOnly,
  updateReview
);

module.exports = router;
