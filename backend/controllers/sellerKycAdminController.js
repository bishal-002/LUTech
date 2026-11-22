const mongoose = require("mongoose");

const User = require("../models/User");

const {
  writeAuditLog,
} = require("../services/auditLogService");

const {
  getPlatformSettings,
} = require("../services/platformSettingsService");

const {
  SELLER_TYPES,
  getKycDocument,
  validateSellerKyc,
  validateApprovedSellerType,
  buildSellerKycResponse,
  sanitizeKycDocument,
} = require("../services/sellerKycService");

const {
  resolvePrivateKycFilePath,
} = require("../services/sellerKycStorageService");

const KYC_SELECT = [
  "+kyc",
  "+warehouseAddress",
  "+adminReviewNote",
  "+sellerApplication.reviewNote",
  "+commissionRate",
].join(" ");

const createControllerError = (statusCode, message, details) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  if (details) {
    error.details = details;
  }

  return error;
};

const isSubmittedKyc = (user) =>
  Boolean(
    user?.kyc?.submittedAt &&
    user.verificationStatus === "pending_review"
  );

const getSellerForReview = async (id, session = null) => {
  let query = User.findById(id).select(KYC_SELECT);

  if (session) {
    query = query.session(session);
  }

  return query;
};

// ======================================================
// GET KYC REVIEW QUEUE
// GET /api/admin/sellers/kyc/queue
// ======================================================

const getSellerKycQueue = async (req, res) => {
  try {
    const applicants = await User.find({
      sellerStatus: "pending",
      verificationStatus: "pending_review",
      "kyc.submittedAt": { $ne: null },
      role: { $in: ["customer", "seller"] },
    })
      .select(
        [
          "_id",
          "name",
          "email",
          "role",
          "isVerified",
          "sellerStatus",
          "verificationStatus",
          "storeName",
          "createdAt",
          "+kyc.submittedAt",
          "+kyc.businessType",
          "+kyc.requestedSellerType",
        ].join(" ")
      )
      .sort({ "kyc.submittedAt": 1 });

    const result = applicants.map((applicant) => ({
      _id: applicant._id,
      name: applicant.name,
      email: applicant.email,
      role: applicant.role,
      isEmailVerified: applicant.isVerified,
      sellerStatus: applicant.sellerStatus,
      verificationStatus: applicant.verificationStatus,
      storeName: applicant.storeName,
      businessType: applicant.kyc?.businessType || "individual",
      requestedSellerType:
        applicant.kyc?.requestedSellerType || "standard_seller",
      submittedAt: applicant.kyc?.submittedAt || null,
      createdAt: applicant.createdAt,
    }));

    return res.status(200).json({
      count: result.length,
      applicants: result,
    });
  } catch (error) {
    console.error("Get seller KYC queue error:", error);

    return res.status(500).json({
      message: "Unable to retrieve seller KYC queue.",
    });
  }
};

// ======================================================
// GET SELLER KYC DETAILS
// GET /api/admin/sellers/:id/kyc
// ======================================================

const getSellerKycDetails = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid seller ID.",
      });
    }

    const seller = await getSellerForReview(req.params.id);

    if (!seller) {
      return res.status(404).json({
        message: "Seller applicant not found.",
      });
    }

    const response = {
      _id: seller._id,
      name: seller.name,
      email: seller.email,
      role: seller.role,
      isEmailVerified: seller.isVerified,
      sellerStatus: seller.sellerStatus,
      verificationStatus: seller.verificationStatus,

      store: {
        storeName: seller.storeName || "",
        storeDescription: seller.storeDescription || "",
        storePhone: seller.storePhone || "",
        storeAddress: seller.storeAddress || "",
      },

      kyc: buildSellerKycResponse(seller),

      review: {
        submittedAt: seller.kyc?.submittedAt || null,
        reviewedAt: seller.sellerApplication?.reviewedAt || null,
        sellerVisibleNote:
          seller.sellerApplication?.reviewNote || "",
        internalNote: seller.adminReviewNote || "",
      },

      isComplete: validateSellerKyc(seller).length === 0,
      validationErrors: validateSellerKyc(seller),
    };

    // Never return internal storage keys or legacy public URLs.
    response.kyc.nidDocuments.front =
      sanitizeKycDocument(seller.kyc?.nidDocuments?.front);

    response.kyc.nidDocuments.back =
      sanitizeKycDocument(seller.kyc?.nidDocuments?.back);

    response.kyc.tradeLicenseDocument =
      sanitizeKycDocument(seller.kyc?.tradeLicenseDocument);

    response.kyc.authorizationDocument =
      sanitizeKycDocument(seller.kyc?.authorizationDocument);

    return res.status(200).json({
      seller: response,
    });
  } catch (error) {
    console.error("Get seller KYC details error:", error);

    return res.status(500).json({
      message: "Unable to retrieve seller KYC details.",
    });
  }
};

// ======================================================
// DOWNLOAD SELLER KYC DOCUMENT
// GET /api/admin/sellers/:id/kyc/documents/:documentType
// ======================================================

const downloadSellerKycDocument = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid seller ID.",
      });
    }

    const seller = await getSellerForReview(req.params.id);

    if (!seller) {
      return res.status(404).json({
        message: "Seller applicant not found.",
      });
    }

    const document = getKycDocument(
      seller,
      req.params.documentType
    );

    if (!document?.storageKey) {
      return res.status(404).json({
        message: "KYC document not found.",
      });
    }

    const filePath = resolvePrivateKycFilePath(
      document.storageKey
    );

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");

    res.type(document.mimeType || "application/octet-stream");

    return res.download(
      filePath,
      document.originalName || "seller-kyc-document",
      (error) => {
        if (error && !res.headersSent) {
          res.status(404).json({
            message: "KYC document could not be found.",
          });
        }
      }
    );
  } catch (error) {
    console.error("Download seller KYC document error:", error);

    return res.status(404).json({
      message: "KYC document not found.",
    });
  }
};

// ======================================================
// APPROVE SELLER
// PUT /api/admin/sellers/:id/approve
// ======================================================

const approveSeller = async (req, res) => {
  let session;

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid applicant ID.",
      });
    }

    session = await mongoose.startSession();

    let approvedSellerId = null;

    await session.withTransaction(async () => {
      const applicant = await getSellerForReview(
        req.params.id,
        session
      );

      if (
        !applicant ||
        applicant.sellerStatus !== "pending" ||
        !["customer", "seller"].includes(applicant.role)
      ) {
        throw createControllerError(
          404,
          "Pending seller application not found."
        );
      }

      if (!applicant.isVerified) {
        throw createControllerError(
          400,
          "The applicant must verify their email first."
        );
      }

      if (!isSubmittedKyc(applicant)) {
        throw createControllerError(
          409,
          "The applicant has not submitted KYC for review."
        );
      }

      const validationErrors = validateSellerKyc(applicant);

      if (validationErrors.length > 0) {
        throw createControllerError(
          422,
          "Seller KYC is incomplete or invalid.",
          validationErrors
        );
      }

      // A requested tier is not automatically trusted.
      // The admin must explicitly choose the tier during approval.
      const approvedSellerType = req.body.sellerType
        ? String(req.body.sellerType).trim()
        : "standard_seller";

      if (!SELLER_TYPES.includes(approvedSellerType)) {
        throw createControllerError(
          400,
          "Invalid approved seller tier."
        );
      }

      const tierErrors = validateApprovedSellerType(
        approvedSellerType,
        applicant.kyc
      );

      if (tierErrors.length > 0) {
        throw createControllerError(
          422,
          "The selected seller tier does not have the required documents.",
          tierErrors
        );
      }

      const settings = await getPlatformSettings({
        session,
      });

      const defaultCommissionRate = Number(
        settings.defaultCommissionRate
      );

      if (
        !Number.isFinite(defaultCommissionRate) ||
        defaultCommissionRate < 0 ||
        defaultCommissionRate > 100
      ) {
        throw createControllerError(
          500,
          "The platform default commission rate is invalid."
        );
      }

      const previousCommissionRate = Number.isFinite(
        Number(applicant.commissionRate)
      )
        ? Number(applicant.commissionRate)
        : 0;

      // Preserve a pre-assigned custom non-zero commission.
      if (previousCommissionRate === 0) {
        applicant.commissionRate = defaultCommissionRate;
      }

      const before = {
        role: applicant.role,
        sellerStatus: applicant.sellerStatus,
        verificationStatus: applicant.verificationStatus,
        sellerType: applicant.sellerType,
        commissionRate: previousCommissionRate,
      };

      applicant.role = "seller";
      applicant.sellerStatus = "approved";
      applicant.verificationStatus = "approved";
      applicant.sellerType = approvedSellerType;

      applicant.adminReviewNote = "";
      applicant.sellerApplication.reviewNote = "";
      applicant.sellerApplication.reviewedAt = new Date();

      await applicant.save({ session });

      const after = {
        role: applicant.role,
        sellerStatus: applicant.sellerStatus,
        verificationStatus: applicant.verificationStatus,
        sellerType: applicant.sellerType,
        commissionRate: applicant.commissionRate,
      };

      await writeAuditLog({
        adminId: req.user._id,
        action: "SELLER_KYC_APPROVED",
        targetType: "Seller",
        targetId: applicant._id,
        changes: {
          before,
          after,
        },
        session,
      });

      approvedSellerId = applicant._id;
    });

    const seller = await User.findById(
      approvedSellerId
    ).select(
      "_id name email role sellerStatus verificationStatus sellerType"
    );

    return res.status(200).json({
      message: "Seller KYC approved successfully.",
      seller,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    if (statusCode === 500) {
      console.error("Approve seller KYC error:", error);
    }

    return res.status(statusCode).json({
      message:
        statusCode === 500
          ? "Unable to approve seller KYC."
          : error.message,

      ...(error.details
        ? { errors: error.details }
        : {}),
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// ======================================================
// REJECT SELLER
// PUT /api/admin/sellers/:id/reject
// ======================================================

const rejectSeller = async (req, res) => {
  let session;

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid applicant ID.",
      });
    }

    const reviewNote =
      typeof req.body.reviewNote === "string"
        ? req.body.reviewNote.trim()
        : "";

    if (!reviewNote) {
      return res.status(400).json({
        message: "A rejection reason is required.",
      });
    }

    if (reviewNote.length > 500) {
      return res.status(400).json({
        message: "Rejection reason cannot exceed 500 characters.",
      });
    }

    session = await mongoose.startSession();

    let rejectedApplicantId = null;

    await session.withTransaction(async () => {
      const applicant = await getSellerForReview(
        req.params.id,
        session
      );

      if (
        !applicant ||
        applicant.sellerStatus !== "pending" ||
        !["customer", "seller"].includes(applicant.role)
      ) {
        throw createControllerError(
          404,
          "Pending seller application not found."
        );
      }

      if (!isSubmittedKyc(applicant)) {
        throw createControllerError(
          409,
          "The applicant has not submitted KYC for review."
        );
      }

      const before = {
        role: applicant.role,
        sellerStatus: applicant.sellerStatus,
        verificationStatus: applicant.verificationStatus,
        sellerType: applicant.sellerType,
      };

      applicant.sellerStatus = "rejected";
      applicant.verificationStatus = "rejected";

      applicant.adminReviewNote = reviewNote;
      applicant.sellerApplication.reviewNote = reviewNote;
      applicant.sellerApplication.reviewedAt = new Date();

      await applicant.save({ session });

      const after = {
        role: applicant.role,
        sellerStatus: applicant.sellerStatus,
        verificationStatus: applicant.verificationStatus,
        sellerType: applicant.sellerType,
      };

      await writeAuditLog({
        adminId: req.user._id,
        action: "SELLER_KYC_REJECTED",
        targetType: "Seller",
        targetId: applicant._id,
        changes: {
          before,
          after,
        },
        note: reviewNote,
        session,
      });

      rejectedApplicantId = applicant._id;
    });

    const applicant = await User.findById(
      rejectedApplicantId
    ).select(
      "_id name email role sellerStatus verificationStatus sellerType"
    );

    return res.status(200).json({
      message: "Seller KYC rejected.",
      applicant,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    if (statusCode === 500) {
      console.error("Reject seller KYC error:", error);
    }

    return res.status(statusCode).json({
      message:
        statusCode === 500
          ? "Unable to reject seller KYC."
          : error.message,
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

module.exports = {
  getSellerKycQueue,
  getSellerKycDetails,
  downloadSellerKycDocument,
  approveSeller,
  rejectSeller,
};