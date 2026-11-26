
const mongoose = require("mongoose");

const Review = require("../models/Review");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

// ======================================================
// CONSTANTS
// ======================================================

const APPROVED_STATUS = "approved";
const PENDING_STATUS = "pending";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// ======================================================
// HELPERS
// ======================================================

const isValidId = (id) =>
  mongoose.isValidObjectId(id);

const parsePagination = (query = {}) => {
  const requestedPage = Number.parseInt(query.page, 10);
  const requestedLimit = Number.parseInt(query.limit, 10);

  const page =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : DEFAULT_PAGE;

  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const normalizeReviewInput = (body = {}) => {
  const rating = Number(body.rating);

  const title =
    typeof body.title === "string"
      ? body.title.trim()
      : "";

  const comment =
    typeof body.comment === "string"
      ? body.comment.trim()
      : "";

  if (
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    throw new Error(
      "Rating must be a whole number between 1 and 5."
    );
  }

  if (title.length < 3 || title.length > 120) {
    throw new Error(
      "Review title must contain between 3 and 120 characters."
    );
  }

  if (comment.length < 10 || comment.length > 3000) {
    throw new Error(
      "Review comment must contain between 10 and 3000 characters."
    );
  }

  return {
    rating,
    title,
    comment,
  };
};

// ======================================================
// REFRESH PRODUCT RATING
// Only approved reviews are included.
// ======================================================

const refreshProductRating = async (
  productId,
  session = null
) => {
  const aggregation = Review.aggregate([
    {
      $match: {
        productId: new mongoose.Types.ObjectId(
          productId
        ),
        status: APPROVED_STATUS,
      },
    },
    {
      $group: {
        _id: "$productId",
        reviewCount: { $sum: 1 },
        averageRating: { $avg: "$rating" },
      },
    },
  ]);

  if (session) {
    aggregation.session(session);
  }

  const [result] = await aggregation;

  const reviewCount = result?.reviewCount || 0;
  const averageRating = result
    ? Math.round(
        (result.averageRating + Number.EPSILON) * 100
      ) / 100
    : 0;

  const update = await Product.updateOne(
    { _id: productId },
    {
      $set: {
        reviewCount,
        averageRating,
      },
    },
    {
      session,
      runValidators: true,
    }
  );

  if (update.matchedCount !== 1) {
    throw new Error(
      "Product not found while refreshing its rating."
    );
  }

  return {
    reviewCount,
    averageRating,
  };
};

// ======================================================
// REFRESH SELLER REVIEW METRICS
// Only approved reviews are included.
// ======================================================

const refreshSellerReviewMetrics = async (
  sellerId,
  session = null
) => {
  const aggregation = Review.aggregate([
    {
      $match: {
        sellerId: new mongoose.Types.ObjectId(
          sellerId
        ),
        status: APPROVED_STATUS,
      },
    },
    {
      $group: {
        _id: "$sellerId",
        reviewCount: { $sum: 1 },
        averageRating: { $avg: "$rating" },
      },
    },
  ]);

  if (session) {
    aggregation.session(session);
  }

  const [result] = await aggregation;

  const reviewCount = result?.reviewCount || 0;
  const averageRating = result
    ? Math.round(
        (result.averageRating + Number.EPSILON) * 100
      ) / 100
    : 0;

  const update = await User.updateOne(
    {
      _id: sellerId,
      role: "seller",
    },
    {
      $set: {
        "metrics.reviewCount": reviewCount,
        "metrics.averageRating": averageRating,
      },
    },
    {
      session,
      runValidators: true,
    }
  );

  if (update.matchedCount !== 1) {
    throw new Error(
      "Seller not found while refreshing review metrics."
    );
  }

  return {
    reviewCount,
    averageRating,
  };
};

// ======================================================
// REFRESH PRODUCT AND SELLER REVIEW METRICS
// ======================================================

const refreshReviewAggregates = async ({
  productId,
  sellerId,
  session = null,
}) => {
  const productMetrics = await refreshProductRating(
    productId,
    session
  );

  const sellerMetrics = await refreshSellerReviewMetrics(
    sellerId,
    session
  );

  return {
    product: productMetrics,
    seller: sellerMetrics,
  };
};

// ======================================================
// CUSTOMER: CREATE REVIEW
// POST /api/reviews
// ======================================================

const createReview = async (req, res) => {
  try {
    if (req.user?.role !== "customer") {
      return res.status(403).json({
        message: "Only customers can submit reviews.",
      });
    }

    const { productId, orderId } = req.body;

    if (
      !isValidId(productId) ||
      !isValidId(orderId)
    ) {
      return res.status(400).json({
        message: "Valid productId and orderId are required.",
      });
    }

    const reviewInput = normalizeReviewInput(req.body);

    // --------------------------------------------------
    // VERIFY DELIVERED PURCHASE
    // --------------------------------------------------

    const order = await Order.findOne({
      _id: orderId,
      customerId: req.user._id,
      status: "delivered",
    }).select("customerId sellerId items status");

    if (!order) {
      return res.status(403).json({
        message:
          "You can review a product only after its order has been delivered.",
      });
    }

    const purchasedItem = order.items.find(
      (item) =>
        String(item.productId) === String(productId)
    );

    if (!purchasedItem) {
      return res.status(403).json({
        message:
          "This product does not belong to the selected order.",
      });
    }

    // --------------------------------------------------
    // VERIFY PRODUCT AND SELLER
    // --------------------------------------------------

    const product = await Product.findOne({
      _id: productId,
      sellerId: order.sellerId,
    }).select("_id title sellerId");

    if (!product) {
      return res.status(404).json({
        message:
          "The purchased product could not be found.",
      });
    }

    // --------------------------------------------------
    // PREVENT DUPLICATE REVIEWS
    // --------------------------------------------------

    const existingReview = await Review.findOne({
      customerId: req.user._id,
      orderId,
      productId,
    }).select("_id");

    if (existingReview) {
      return res.status(409).json({
        message:
          "You have already submitted a review for this product in this order.",
      });
    }

    // --------------------------------------------------
    // CREATE REVIEW
    // --------------------------------------------------

    const review = await Review.create({
      customerId: req.user._id,
      sellerId: order.sellerId,
      productId,
      orderId,

      rating: reviewInput.rating,
      title: reviewInput.title,
      comment: reviewInput.comment,

      // Reviews must be moderated before they affect
      // public product and seller ratings.
      status: PENDING_STATUS,
    });

    return res.status(201).json({
      message:
        "Your review has been submitted and is awaiting moderation.",
      review,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "You have already submitted a review for this product in this order.",
      });
    }

    console.error("Create review:", error);

    return res.status(400).json({
      message:
        error.message || "Unable to submit review.",
    });
  }
};

// ======================================================
// CUSTOMER: EDIT OWN REVIEW
// PUT /api/reviews/:id
// ======================================================

const updateReview = async (req, res) => {
  try {
    if (req.user?.role !== "customer") {
      return res.status(403).json({
        message: "Only customers can edit reviews.",
      });
    }

    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid review ID.",
      });
    }

    const reviewInput = normalizeReviewInput(req.body);

    const review = await Review.findOne({
      _id: req.params.id,
      customerId: req.user._id,
    });

    if (!review) {
      return res.status(404).json({
        message: "Review not found.",
      });
    }

    // Re-check the original purchase before allowing edits.
    const order = await Order.findOne({
      _id: review.orderId,
      customerId: req.user._id,
      status: "delivered",
      sellerId: review.sellerId,
      "items.productId": review.productId,
    }).select("_id");

    if (!order) {
      return res.status(403).json({
        message:
          "The original delivered purchase could not be verified.",
      });
    }

    const previousStatus = review.status;

    review.rating = reviewInput.rating;
    review.title = reviewInput.title;
    review.comment = reviewInput.comment;

    // Any edit must go through moderation again.
    // This prevents an edited review from bypassing
    // moderation while retaining an approved status.
    review.status = PENDING_STATUS;
    review.editedAt = new Date();

    if (review.moderation) {
      review.moderation.reviewedBy = null;
      review.moderation.reviewedAt = null;
      review.moderation.rejectionReason = "";
    }

    await review.save();

    // If an approved review was edited, remove its old
    // rating from the aggregates until it is re-approved.
    if (previousStatus === APPROVED_STATUS) {
      await refreshReviewAggregates({
        productId: review.productId,
        sellerId: review.sellerId,
      });
    }

    return res.status(200).json({
      message:
        "Your review has been updated and submitted for moderation again.",
      review,
    });
  } catch (error) {
    console.error("Update review:", error);

    return res.status(400).json({
      message:
        error.message || "Unable to update review.",
    });
  }
};

// ======================================================
// CUSTOMER: GET OWN REVIEWS
// GET /api/reviews/mine
// ======================================================

const getMyReviews = async (req, res) => {
  try {
    if (req.user?.role !== "customer") {
      return res.status(403).json({
        message: "Customer access only.",
      });
    }

    const { page, limit, skip } = parsePagination(
      req.query
    );

    const filter = {
      customerId: req.user._id,
    };

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("productId", "title slug images image")
        .populate("sellerId", "name storeName storeSlug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Review.countDocuments(filter),
    ]);

    return res.status(200).json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get customer reviews:", error);

    return res.status(500).json({
      message: "Unable to retrieve your reviews.",
    });
  }
};

// ======================================================
// PUBLIC: GET APPROVED PRODUCT REVIEWS
// GET /api/reviews/product/:productId
// ======================================================

const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!isValidId(productId)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findById(
      productId
    ).select("_id");

    if (!product) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    const { page, limit, skip } = parsePagination(
      req.query
    );

    const filter = {
      productId,
      status: APPROVED_STATUS,
    };

    const [reviews, total, ratingSummary] =
      await Promise.all([
        Review.find(filter)
          .populate("customerId", "name")
          .select(
            "customerId productId rating title comment helpfulCount sellerReply createdAt updatedAt"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),

        Review.countDocuments(filter),

        Review.aggregate([
          {
            $match: {
              productId: new mongoose.Types.ObjectId(
                productId
              ),
              status: APPROVED_STATUS,
            },
          },
          {
            $group: {
              _id: null,
              reviewCount: { $sum: 1 },
              averageRating: { $avg: "$rating" },
              fiveStars: {
                $sum: {
                  $cond: [{ $eq: ["$rating", 5] }, 1, 0],
                },
              },
              fourStars: {
                $sum: {
                  $cond: [{ $eq: ["$rating", 4] }, 1, 0],
                },
              },
              threeStars: {
                $sum: {
                  $cond: [{ $eq: ["$rating", 3] }, 1, 0],
                },
              },
              twoStars: {
                $sum: {
                  $cond: [{ $eq: ["$rating", 2] }, 1, 0],
                },
              },
              oneStar: {
                $sum: {
                  $cond: [{ $eq: ["$rating", 1] }, 1, 0],
                },
              },
            },
          },
        ]),
      ]);

    const summary = ratingSummary[0] || {
      reviewCount: 0,
      averageRating: 0,
      fiveStars: 0,
      fourStars: 0,
      threeStars: 0,
      twoStars: 0,
      oneStar: 0,
    };

    summary.averageRating = Math.round(
      (summary.averageRating + Number.EPSILON) * 100
    ) / 100;

    return res.status(200).json({
      reviews,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get product reviews:", error);

    return res.status(500).json({
      message: "Unable to retrieve product reviews.",
    });
  }
};

// ======================================================
// SELLER: GET REVIEWS FOR OWN PRODUCTS
// GET /api/reviews/seller
// ======================================================

const getSellerReviews = async (req, res) => {
  try {
    if (req.user?.role !== "seller") {
      return res.status(403).json({
        message: "Seller access only.",
      });
    }

    const { page, limit, skip } = parsePagination(
      req.query
    );

    const filter = {
      sellerId: req.user._id,
    };

    if (req.query.status) {
      const allowedStatuses = [
        "pending",
        "approved",
        "rejected",
      ];

      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({
          message: "Invalid review status filter.",
        });
      }

      filter.status = req.query.status;
    }

    if (req.query.productId) {
      if (!isValidId(req.query.productId)) {
        return res.status(400).json({
          message: "Invalid product ID.",
        });
      }

      filter.productId = req.query.productId;
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("productId", "title slug images image")
        .populate("customerId", "name")
        .select(
          "customerId sellerId productId orderId rating title comment status helpfulCount sellerReply createdAt updatedAt"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Review.countDocuments(filter),
    ]);

    return res.status(200).json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get seller reviews:", error);

    return res.status(500).json({
      message: "Unable to retrieve seller reviews.",
    });
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createReview,
  updateReview,
  getMyReviews,
  getProductReviews,
  getSellerReviews,

  // Export aggregate refresh helpers for Part 4 moderation.
  refreshProductRating,
  refreshSellerReviewMetrics,
  refreshReviewAggregates,
};
