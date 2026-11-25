
const mongoose = require("mongoose");

const User = require("../models/User");

const {
  writeAuditLog,
} = require("../services/auditLogService");

const {
  validateApprovedSellerType,
} = require("../services/sellerKycService");

// Only these existing seller types can be upgraded
// from the two baseline seller classifications.
const BASELINE_SELLER_TYPES = [
  "standard_seller",
  "individual_seller",
];

const UPGRADE_SELLER_TYPES = [
  "verified_shop",
  "authorized_reseller",
  "official_brand",
];

const createControllerError = (
  statusCode,
  message,
  details = null
) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  if (details) {
    error.details = details;
  }

  return error;
};

// ======================================================
// UPGRADE SELLER TIER
// PATCH /api/admin/sellers/:id/upgrade-tier
// ======================================================

const upgradeSellerTier = async (req, res) => {
  let session = null;

  try {
    const sellerId = req.params.id;
    const body = req.body || {};

    if (!mongoose.isValidObjectId(sellerId)) {
      throw createControllerError(
        400,
        "Invalid seller ID."
      );
    }

    // Reject unsupported fields.
    const unsupportedFields = Object.keys(body).filter(
      (field) => !["sellerType", "note"].includes(field)
    );

    if (unsupportedFields.length > 0) {
      throw createControllerError(
        400,
        `Unsupported fields: ${unsupportedFields.join(", ")}`
      );
    }

    const nextSellerType =
      typeof body.sellerType === "string"
        ? body.sellerType.trim()
        : "";

    const note =
      typeof body.note === "string"
        ? body.note.trim()
        : "";

    if (!UPGRADE_SELLER_TYPES.includes(nextSellerType)) {
      throw createControllerError(
        400,
        "Select a valid upgrade tier: verified_shop, authorized_reseller or official_brand."
      );
    }

    if (note.length < 3 || note.length > 500) {
      throw createControllerError(
        400,
        "An upgrade reason between 3 and 500 characters is required."
      );
    }

    session = await mongoose.startSession();

    let updatedSellerId = null;

    await session.withTransaction(async () => {
      // KYC is select:false and must be explicitly loaded.
      const seller = await User.findById(sellerId)
        .select("+kyc")
        .session(session);

      if (!seller) {
        throw createControllerError(
          404,
          "Seller account not found."
        );
      }

      if (
        seller.role !== "seller" ||
        seller.sellerStatus !== "approved" ||
        seller.verificationStatus !== "approved"
      ) {
        throw createControllerError(
          409,
          "Only approved seller accounts can receive a tier upgrade."
        );
      }

      if (seller.status !== "active") {
        throw createControllerError(
          409,
          "A suspended or inactive seller cannot receive a tier upgrade."
        );
      }

      const currentSellerType =
        seller.sellerType || "standard_seller";

      if (
        !BASELINE_SELLER_TYPES.includes(
          currentSellerType
        )
      ) {
        throw createControllerError(
          409,
          "Only standard or individual sellers can use this tier-upgrade operation."
        );
      }

      if (currentSellerType === nextSellerType) {
        throw createControllerError(
          409,
          "The seller already has this tier."
        );
      }

      // Check the seller's existing submitted documents.
      const tierErrors = validateApprovedSellerType(
        nextSellerType,
        seller.kyc
      );

      if (tierErrors.length > 0) {
        throw createControllerError(
          422,
          "The seller does not meet the document requirements for this tier.",
          tierErrors
        );
      }

      // Snapshot before changing the seller.
      const before = {
        sellerType: currentSellerType,
      };

      seller.sellerType = nextSellerType;

      await seller.save({
        session,
      });

      // Snapshot after changing the seller.
      const after = {
        sellerType: seller.sellerType,
      };

      // Save the audit event in the same transaction.
      // If the audit write fails, the seller change rolls back.
      await writeAuditLog({
        adminId: req.user._id,
        action: "SELLER_TIER_UPGRADED",
        targetType: "Seller",
        targetId: seller._id,

        changes: {
          before,
          after,
        },

        note,
        session,
      });

      updatedSellerId = seller._id;
    });

    const updatedSeller = await User.findById(
      updatedSellerId
    ).select(
      "_id name email storeName role status sellerStatus verificationStatus sellerType updatedAt"
    );

    return res.status(200).json({
      success: true,
      message: "Seller tier upgraded successfully.",
      seller: updatedSeller,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,

        ...(error.details
          ? { errors: error.details }
          : {}),
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Seller tier validation failed.",
        errors: Object.values(error.errors).map(
          (item) => item.message
        ),
      });
    }

    console.error("Upgrade seller tier error:", error);

    return res.status(500).json({
      message: "Unable to upgrade seller tier.",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

module.exports = {
  upgradeSellerTier,
};
