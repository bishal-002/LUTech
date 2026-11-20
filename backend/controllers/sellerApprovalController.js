const mongoose = require("mongoose");

const User = require("../models/User");

const {
  writeAuditLog,
} = require("../services/auditLogService");

const {
  getPlatformSettings,
} = require("../services/platformSettingsService");

// ======================================================
// CUSTOM CONTROLLER ERROR
// ======================================================

const createControllerError = (
  statusCode,
  message
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
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
      // commissionRate is select:false in the User schema.
      const applicant = await User.findById(
        req.params.id
      )
        .select("+commissionRate")
        .session(session);

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

      // Get the current platform default inside the transaction.
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

      const previousCommissionRate =
        Number.isFinite(Number(applicant.commissionRate))
          ? Number(applicant.commissionRate)
          : 0;

      // Preserve existing custom non-zero commission rates.
      // The existing schema uses zero as the unassigned/default value.
      if (previousCommissionRate === 0) {
        applicant.commissionRate =
          defaultCommissionRate;
      }

      // Snapshot before changing the seller account.
      const before = {
        role: applicant.role,
        sellerStatus: applicant.sellerStatus,
        verificationStatus:
          applicant.verificationStatus,
        commissionRate: previousCommissionRate,
      };

      applicant.role = "seller";
      applicant.sellerStatus = "approved";
      applicant.verificationStatus = "approved";
      applicant.adminReviewNote = "";
      applicant.sellerApplication.reviewedAt =
        new Date();

      await applicant.save({ session });

      const after = {
        role: applicant.role,
        sellerStatus: applicant.sellerStatus,
        verificationStatus:
          applicant.verificationStatus,
        commissionRate: applicant.commissionRate,
      };

      // Record approval and commission assignment together.
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
      "_id name email role sellerStatus verificationStatus"
    );

    return res.status(200).json({
      message: "Seller application approved.",
      seller,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;

    if (statusCode === 500) {
      console.error("Approve seller:", error);
    }

    return res.status(statusCode).json({
      message:
        statusCode === 500
          ? "Unable to approve seller."
          : error.message,
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

module.exports = {
  approveSeller,
};