const mongoose = require("mongoose");

const Payout = require("../models/Payout");
const User = require("../models/User");

const {
  refreshMaturedPayouts,
} = require("../services/payoutService");

const {
  isEncryptedSensitiveValue,
  decryptSensitiveValue,
} = require("../services/payoutEncryptionService");

const {
  writeAuditLog,
} = require("../services/auditLogService");

// ======================================================
// CONSTANTS
// ======================================================

const PAYOUT_SELECT = [
  "+payout",
  "+payout.method",
  "+payout.bankName",
  "+payout.branchName",
  "+payout.routingNumber",
  "+payout.accountHolderName",
  "+payout.accountNumber",
  "+payout.mfsProvider",
  "+payout.mfsAccountType",
  "+payout.mfsNumber",
].join(" ");

const ALLOWED_STATUSES = [
  "on_hold",
  "available",
  "paid",
  "cancelled",
];

// ======================================================
// HELPERS
// ======================================================

const createControllerError = (
  statusCode,
  message
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const handleError = (
  res,
  error,
  fallbackMessage
) => {
  const statusCode =
    error.statusCode ||
    (
      error.name === "ValidationError" ||
      error.name === "CastError"
        ? 400
        : error.code === 11000
          ? 409
          : 500
    );

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

const maskLastFour = (value, prefix = "****") => {
  const text = String(value || "");

  if (text.length < 4) return "";

  return `${prefix}${text.slice(-4)}`;
};

// This function is only used by administrator endpoints.
// These routes require process_payouts and 2FA.
const buildAdminPayoutDestination = (
  payout
) => {
  if (!payout || !payout.method) {
    return null;
  }

  if (payout.method === "bank_transfer") {
    if (
      !isEncryptedSensitiveValue(
        payout.accountNumber
      )
    ) {
      throw createControllerError(
        409,
        "Seller bank details are not encrypted. Run the payout migration script."
      );
    }

    const accountNumber =
      decryptSensitiveValue(
        payout.accountNumber
      );

    return {
      method: "bank_transfer",
      bankName: payout.bankName,
      branchName: payout.branchName,
      routingNumber: payout.routingNumber,
      accountHolderName:
        payout.accountHolderName,
      accountNumber,
      maskedAccountNumber:
        maskLastFour(accountNumber),
    };
  }

  if (payout.method === "mfs") {
    if (
      !isEncryptedSensitiveValue(
        payout.mfsNumber
      )
    ) {
      throw createControllerError(
        409,
        "Seller MFS details are not encrypted. Run the payout migration script."
      );
    }

    const mfsNumber =
      decryptSensitiveValue(
        payout.mfsNumber
      );

    return {
      method: "mfs",
      mfsProvider: payout.mfsProvider,
      mfsAccountType: payout.mfsAccountType,
      mfsNumber,
      maskedMfsNumber:
        maskLastFour(mfsNumber, "*******"),
    };
  }

  return null;
};

// ======================================================
// GET ADMIN PAYOUT SUMMARY
// GET /api/admin/payouts/summary
// ======================================================

const getAdminPayoutSummary = async (
  req,
  res
) => {
  try {
    await refreshMaturedPayouts();

    const result = await Payout.aggregate([
      {
        $group: {
          _id: null,

          totalPayouts: {
            $sum: 1,
          },

          totalEarnings: {
            $sum: "$netAmount",
          },

          onHoldAmount: {
            $sum: {
              $cond: [
                { $eq: ["$status", "on_hold"] },
                "$netAmount",
                0,
              ],
            },
          },

          availableAmount: {
            $sum: {
              $cond: [
                { $eq: ["$status", "available"] },
                "$netAmount",
                0,
              ],
            },
          },

          paidAmount: {
            $sum: {
              $cond: [
                { $eq: ["$status", "paid"] },
                "$netAmount",
                0,
              ],
            },
          },
        },
      },
    ]);

    const summary = result[0] || {
      totalPayouts: 0,
      totalEarnings: 0,
      onHoldAmount: 0,
      availableAmount: 0,
      paidAmount: 0,
    };

    delete summary._id;

    return res.status(200).json({
      message:
        "Admin payout summary retrieved successfully.",
      currency: "BDT",
      summary,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to retrieve payout summary."
    );
  }
};

// ======================================================
// GET ALL PAYOUTS
// GET /api/admin/payouts
// ======================================================

const getAdminPayouts = async (req, res) => {
  try {
    await refreshMaturedPayouts();

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

    if (req.query.status) {
      if (
        !ALLOWED_STATUSES.includes(req.query.status)
      ) {
        return res.status(400).json({
          message: "Invalid payout status filter.",
        });
      }

      filter.status = req.query.status;
    }

    const [payouts, totalPayouts] =
      await Promise.all([
        Payout.find(filter)
          .populate(
            "sellerId",
            "name email storeName storeSlug"
          )
          .populate(
            "orderId",
            "createdAt status totalAmount"
          )
          .populate(
            "processedBy",
            "name email"
          )
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),

        Payout.countDocuments(filter),
      ]);

    return res.status(200).json({
      message: "Payouts retrieved successfully.",
      payouts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(
          totalPayouts / limit
        ),
        totalPayouts,
        limit,
      },
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to retrieve payouts."
    );
  }
};

// ======================================================
// GET PAYOUT DETAILS
// GET /api/admin/payouts/:id
// ======================================================

const getAdminPayoutDetails = async (
  req,
  res
) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid payout ID.",
      });
    }

    await refreshMaturedPayouts();

    const payout = await Payout.findById(
      req.params.id
    )
      .populate(
        "sellerId",
        "name email storeName storeSlug"
      )
      .populate(
        "orderId",
        "createdAt status totalAmount"
      )
      .populate(
        "processedBy",
        "name email"
      );

    if (!payout) {
      return res.status(404).json({
        message: "Payout not found.",
      });
    }

    const sellerId =
      payout.sellerId?._id || payout.sellerId;

    const seller = await User.findById(
      sellerId
    ).select(PAYOUT_SELECT);

    if (!seller) {
      return res.status(404).json({
        message:
          "Seller account for this payout was not found.",
      });
    }

    const payoutDestination =
      buildAdminPayoutDestination(
        seller.payout
      );

    return res.status(200).json({
      message:
        "Payout details retrieved successfully.",
      payout,
      payoutDestination,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to retrieve payout details."
    );
  }
};

// ======================================================
// PROCESS / RELEASE PAYOUT
// PUT /api/admin/payouts/:id/process
// ======================================================

const processPayout = async (req, res) => {
  let session;

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid payout ID.",
      });
    }

    const transactionReference = String(
      req.body.transactionReference || ""
    ).trim();

    const note = String(
      req.body.note || ""
    ).trim();

    if (
      transactionReference.length < 3 ||
      transactionReference.length > 120 ||
      /[\r\n]/.test(transactionReference)
    ) {
      return res.status(400).json({
        message:
          "Provide a valid bank/MFS transaction reference between 3 and 120 characters.",
      });
    }

    if (note.length < 3 || note.length > 500) {
      return res.status(400).json({
        message:
          "An internal processing note between 3 and 500 characters is required.",
      });
    }

    session = await mongoose.startSession();

    let processedPayoutId = null;

    await session.withTransaction(async () => {
      const payout = await Payout.findById(
        req.params.id
      ).session(session);

      if (!payout) {
        throw createControllerError(
          404,
          "Payout not found."
        );
      }

      const now = new Date();

      // Refresh an expired hold immediately before processing.
      if (
        payout.status === "on_hold" &&
        payout.eligibleAt.getTime() <= now.getTime()
      ) {
        payout.status = "available";
        await payout.save({ session });
      }

      if (payout.status !== "available") {
        throw createControllerError(
          409,
          payout.status === "on_hold"
            ? "This payout is still within its hold period."
            : "Only available payouts can be processed."
        );
      }

      const seller = await User.findById(
        payout.sellerId
      )
        .select(PAYOUT_SELECT)
        .session(session);

      if (!seller) {
        throw createControllerError(
          404,
          "Seller account was not found."
        );
      }

      if (
        seller.role !== "seller" ||
        seller.sellerStatus !== "approved" ||
        seller.verificationStatus !== "approved" ||
        seller.status !== "active"
      ) {
        throw createControllerError(
          409,
          "The seller is not currently eligible to receive payouts."
        );
      }

      const payoutDestination =
        buildAdminPayoutDestination(
          seller.payout
        );

      if (!payoutDestination) {
        throw createControllerError(
          409,
          "The seller has not configured a valid payout destination."
        );
      }

      const before = {
        status: payout.status,
        netAmount: payout.netAmount,
        eligibleAt: payout.eligibleAt,
      };

      payout.status = "paid";
      payout.paymentMethod =
        payoutDestination.method;

      payout.destinationLast4 =
        payoutDestination.method === "bank_transfer"
          ? payoutDestination.accountNumber.slice(-4)
          : payoutDestination.mfsNumber.slice(-4);

      payout.transactionReference =
        transactionReference;

      payout.processedBy = req.user._id;
      payout.paidAt = now;
      payout.processingNote = note;

      await payout.save({ session });

      const after = {
        status: payout.status,
        netAmount: payout.netAmount,
        paymentMethod: payout.paymentMethod,
        destinationLast4:
          payout.destinationLast4,
        transactionReference:
          payout.transactionReference,
        paidAt: payout.paidAt,
        processedBy: req.user._id.toString(),
      };

      await writeAuditLog({
        adminId: req.user._id,
        action: "PAYOUT_RELEASED",
        targetType: "Payout",
        targetId: payout._id,
        changes: {
          before,
          after,
        },
        note,
        session,
      });

      processedPayoutId = payout._id;
    });

    const processedPayout = await Payout.findById(
      processedPayoutId
    )
      .populate(
        "sellerId",
        "name email storeName"
      )
      .populate(
        "processedBy",
        "name email"
      );

    return res.status(200).json({
      message:
        "Payout marked as paid and audit log recorded.",
      payout: processedPayout,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to process payout."
    );
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  getAdminPayoutSummary,
  getAdminPayouts,
  getAdminPayoutDetails,
  processPayout,
};