
const mongoose = require("mongoose");

const Review = require("../models/Review");
const { writeAuditLog } = require("../services/auditLogService");
const {
  refreshReviewAggregates,
} = require("./reviewController");

// ======================================================
// CONSTANTS AND HELPERS
// ======================================================

const REVIEW_STATUSES = ["pending", "approved", "rejected"];

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const handleError = (res, error, fallbackMessage) => {
  const statusCode = error.statusCode || 500;

  if (statusCode === 500) {
    console.error(fallbackMessage, error);
  }

  return res.status(statusCode).json({
    message: statusCode === 500 ? fallbackMessage : error.message,
  });
};

const getModerationNote = (value, required = false) => {
  if (value === undefined || value === null) {
    if (required) {
      throw new HttpError(400, "A rejection reason is required.");
    }
    return "";
  }

  if (typeof value !== "string") {
    throw new HttpError(400, "Moderation reason must be text.");
  }

  const note = value.trim();

  if (note.length > 500) {
    throw new HttpError(
      400,
      "Moderation reason cannot exceed 500 characters."
    );
  }

  if (required && !note) {
    throw new HttpError(400, "A rejection reason is required.");
  }

  return note;
};

const createReviewSnapshot = (review) => ({
  reviewId: review._id.toString(),
  customerId: review.customerId?.toString() || null,
  sellerId: review.sellerId?.toString() || null,
  productId: review.productId?.toString() || null,
  orderId: review.orderId?.toString() || null,
  rating: review.rating,
  title: review.title,
  comment: review.comment,
  status: review.status,
  reviewedBy: review.moderation?.reviewedBy?.toString() || null,
  reviewedAt: review.moderation?.reviewedAt || null,
  rejectionReason: review.moderation?.rejectionReason || "",
});

// ======================================================
// GET REVIEWS FOR ADMIN MODERATION
// GET /api/admin/reviews
// ======================================================

const getReviewsForModeration = async (req, res) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );

    const status = req.query.status || "pending";
    const filter = {};

    if (status !== "all") {
      if (!REVIEW_STATUSES.includes(status)) {
        throw new HttpError(400, "Invalid review status filter.");
      }

      filter.status = status;
    }

    if (req.query.productId) {
      if (!mongoose.isValidObjectId(req.query.productId)) {
        throw new HttpError(400, "Invalid product ID.");
      }

      filter.productId = req.query.productId;
    }

    if (req.query.sellerId) {
      if (!mongoose.isValidObjectId(req.query.sellerId)) {
        throw new HttpError(400, "Invalid seller ID.");
      }

      filter.sellerId = req.query.sellerId;
    }

    if (req.query.rating !== undefined) {
      const rating = Number(req.query.rating);

      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new HttpError(400, "Rating must be between 1 and 5.");
      }

      filter.rating = rating;
    }

    const [reviews, totalReviews] = await Promise.all([
      Review.find(filter)
        .populate("customerId", "name email")
        .populate("sellerId", "name email")
        .populate("productId", "title name images image")
        .populate("orderId", "orderNumber status")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Review.countDocuments(filter),
    ]);

    return res.status(200).json({
      reviews,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        limit,
      },
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to retrieve reviews for moderation."
    );
  }
};

// ======================================================
// COMMON REVIEW MODERATION TRANSACTION
// ======================================================

const moderateReview = async (
  req,
  res,
  {
    action,
    targetStatus,
    noteRequired = false,
    successMessage,
  }
) => {
  let session;

  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw new HttpError(400, "Invalid review ID.");
    }

    const note = getModerationNote(req.body?.note, noteRequired);

    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const review = await Review.findById(id).session(session);

      if (!review) {
        throw new HttpError(404, "Review not found.");
      }

      if (review.status !== "pending") {
        throw new HttpError(
          409,
          `Only pending reviews can be ${targetStatus}.`
        );
      }

      const before = createReviewSnapshot(review);

      review.status = targetStatus;
      review.moderation = {
        ...(review.moderation?.toObject
          ? review.moderation.toObject()
          : review.moderation || {}),
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
        rejectionReason: targetStatus === "rejected" ? note : "",
      };

      await review.save({ session });

      // Recalculate only from approved reviews.
      // This keeps product and seller aggregates consistent
      // with the moderation decision.
      await refreshReviewAggregates({
        productId: review.productId,
        sellerId: review.sellerId,
        session,
      });

      const after = createReviewSnapshot(review);

      await writeAuditLog({
        adminId: req.user._id,
        action,
        targetType: "Review",
        targetId: review._id,
        changes: {
          before,
          after,
        },
        note: note || undefined,
        session,
      });
    });

    const updatedReview = await Review.findById(id)
      .populate("customerId", "name email")
      .populate("sellerId", "name email")
      .populate("productId", "title name")
      .populate("orderId", "orderNumber status");

    return res.status(200).json({
      message: successMessage,
      review: updatedReview,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to process review moderation."
    );
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// ======================================================
// APPROVE REVIEW
// PATCH /api/admin/reviews/:id/approve
// ======================================================

const approveReview = async (req, res) => {
  return moderateReview(req, res, {
    action: "REVIEW_APPROVED",
    targetStatus: "approved",
    successMessage: "Review approved successfully.",
  });
};

// ======================================================
// REJECT REVIEW
// PATCH /api/admin/reviews/:id/reject
// ======================================================

const rejectReview = async (req, res) => {
  return moderateReview(req, res, {
    action: "REVIEW_REJECTED",
    targetStatus: "rejected",
    noteRequired: true,
    successMessage: "Review rejected successfully.",
  });
};

module.exports = {
  getReviewsForModeration,
  approveReview,
  rejectReview,
};
