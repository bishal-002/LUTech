
const mongoose = require("mongoose");

const Product = require("../models/Product");
const { writeAuditLog } = require("../services/auditLogService");

// ======================================================
// CONSTANTS
// ======================================================

const MODERATION_STATUSES = [
  "pending_review",
  "approved",
  "rejected",
  "suspended",
];

// ======================================================
// CUSTOM ERROR
// ======================================================

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// ======================================================
// PRODUCT AUDIT SNAPSHOT
// ======================================================

const createProductSnapshot = (product) => ({
  title: product.title,
  moderationStatus: product.moderationStatus,
  isGenuineVerified: product.isGenuineVerified,
  sellerId: product.sellerId?.toString() || null,
  brandId: product.brandId?.toString() || null,
  categoryId: product.categoryId?.toString() || null,
  moderatedBy: product.moderatedBy?.toString() || null,
  moderatedAt: product.moderatedAt || null,
  genuineVerifiedBy:
    product.genuineVerifiedBy?.toString() || null,
  genuineVerifiedAt: product.genuineVerifiedAt || null,
});

// ======================================================
// COMMON ERROR HANDLER
// ======================================================

const handleError = (res, error, fallbackMessage) => {
  const statusCode = error.statusCode || 500;

  if (statusCode === 500) {
    console.error(fallbackMessage, error);
  }

  return res.status(statusCode).json({
    message:
      statusCode === 500
        ? fallbackMessage
        : error.message,
  });
};

// ======================================================
// COMMON NOTE VALIDATION
// ======================================================

const getModerationNote = (value, required = false) => {
  if (value === undefined || value === null) {
    if (required) {
      throw new HttpError(
        400,
        "A moderation reason is required."
      );
    }

    return "";
  }

  if (typeof value !== "string") {
    throw new HttpError(
      400,
      "Moderation reason must be text."
    );
  }

  const note = value.trim();

  if (note.length > 500) {
    throw new HttpError(
      400,
      "Moderation reason cannot exceed 500 characters."
    );
  }

  if (required && !note) {
    throw new HttpError(
      400,
      "A moderation reason is required."
    );
  }

  return note;
};

// ======================================================
// GET PRODUCTS FOR MODERATION
// GET /api/admin/products
// ======================================================

const getProductsForModeration = async (req, res) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(req.query.limit, 10) || 20
      )
    );

    const filter = {};

    // By default, show products awaiting review.
    const status = req.query.status || "pending_review";

    if (status !== "all") {
      if (!MODERATION_STATUSES.includes(status)) {
        return res.status(400).json({
          message: "Invalid moderation status filter.",
        });
      }

      filter.moderationStatus = status;
    }

    // Optional search by product title or MPN.
    if (req.query.search?.trim()) {
      const searchTerm = req.query.search.trim();

      const escapedSearch = searchTerm.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const regex = new RegExp(escapedSearch, "i");

      filter.$or = [
        { title: regex },
        { mpn: regex },
      ];
    }

    const [products, totalProducts] = await Promise.all([
      Product.find(filter)
        .select("-verificationProof -moderationNote")
        .populate("brandId", "name")
        .populate("categoryId", "name")
        .populate("sellerId", "name email sellerType")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        totalProducts,
        limit,
      },
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to retrieve products for moderation."
    );
  }
};

// ======================================================
// COMMON MODERATION TRANSACTION
// ======================================================

const moderateProduct = async (
  req,
  res,
  {
    action,
    noteRequired = false,
    successMessage,
    applyChanges,
  }
) => {
  let session;

  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw new HttpError(400, "Invalid product ID.");
    }

    const note = getModerationNote(
      req.body?.note,
      noteRequired
    );

    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const product = await Product.findById(id).session(
        session
      );

      if (!product) {
        throw new HttpError(404, "Product not found.");
      }

      const before = createProductSnapshot(product);

      // Perform the specific moderation operation.
      applyChanges(product, note, req.user._id);

      await product.save({ session });

      const after = createProductSnapshot(product);

      // Audit record and product update share one transaction.
      await writeAuditLog({
        adminId: req.user._id,
        action,
        targetType: "Product",
        targetId: product._id,
        changes: {
          before,
          after,
        },
        note: note || undefined,
        session,
      });
    });

    const updatedProduct = await Product.findById(id)
      .select("-verificationProof -moderationNote")
      .populate("brandId", "name")
      .populate("categoryId", "name")
      .populate("sellerId", "name email");

    return res.status(200).json({
      message: successMessage,
      product: updatedProduct,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to process product moderation."
    );
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// ======================================================
// APPROVE PRODUCT
// PATCH /api/admin/products/:id/approve
// ======================================================

const approveProduct = async (req, res) => {
  return moderateProduct(req, res, {
    action: "PRODUCT_APPROVED",
    successMessage: "Product approved successfully.",

    applyChanges: (product, note, adminId) => {
      if (product.moderationStatus !== "pending_review") {
        throw new HttpError(
          409,
          "Only products awaiting review can be approved."
        );
      }

      product.moderationStatus = "approved";
      product.moderationNote = "";
      product.moderatedBy = adminId;
      product.moderatedAt = new Date();
    },
  });
};

// ======================================================
// REJECT PRODUCT
// PATCH /api/admin/products/:id/reject
// ======================================================

const rejectProduct = async (req, res) => {
  return moderateProduct(req, res, {
    action: "PRODUCT_REJECTED",
    noteRequired: true,
    successMessage: "Product rejected successfully.",

    applyChanges: (product, note, adminId) => {
      if (product.moderationStatus !== "pending_review") {
        throw new HttpError(
          409,
          "Only products awaiting review can be rejected."
        );
      }

      product.moderationStatus = "rejected";
      product.moderationNote = note;
      product.moderatedBy = adminId;
      product.moderatedAt = new Date();
    },
  });
};

// ======================================================
// VERIFY GENUINE PRODUCT
// PATCH /api/admin/products/:id/verify-genuine
// ======================================================

const verifyGenuineProduct = async (req, res) => {
  return moderateProduct(req, res, {
    action: "PRODUCT_VERIFIED_GENUINE",
    successMessage: "Product verified as genuine successfully.",

    applyChanges: (product, note, adminId) => {
      if (product.moderationStatus !== "approved") {
        throw new HttpError(
          400,
          "Only approved products can receive genuine verification."
        );
      }

      if (product.isGenuineVerified) {
        throw new HttpError(
          409,
          "This product is already verified as genuine."
        );
      }

      product.isGenuineVerified = true;
      product.genuineVerifiedBy = adminId;
      product.genuineVerifiedAt = new Date();
    },
  });
};

// ======================================================
// SUSPEND PRODUCT
// PATCH /api/admin/products/:id/suspend
// ======================================================

const suspendProduct = async (req, res) => {
  return moderateProduct(req, res, {
    action: "PRODUCT_SUSPENDED",
    noteRequired: true,
    successMessage: "Product suspended successfully.",

    applyChanges: (product, note, adminId) => {
      if (product.moderationStatus !== "approved") {
        throw new HttpError(
          409,
          "Only approved products can be suspended."
        );
      }

      product.moderationStatus = "suspended";
      product.moderationNote = note;
      product.moderatedBy = adminId;
      product.moderatedAt = new Date();
    },
  });
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  getProductsForModeration,
  approveProduct,
  rejectProduct,
  verifyGenuineProduct,
  suspendProduct,
};
