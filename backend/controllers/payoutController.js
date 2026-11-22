const mongoose = require("mongoose");

const User = require("../models/User");
const Payout = require("../models/Payout");

const {
  refreshMaturedPayouts,
} = require("../services/payoutService");

const {
  isEncryptedSensitiveValue,
  encryptSensitiveValue,
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

const ALLOWED_PAYOUT_STATUSES = [
  "on_hold",
  "available",
  "paid",
  "cancelled",
];

// ======================================================
// HELPERS
// ======================================================

const isPlainObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

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

const normalizeMfsNumber = (input) => {
  let value = String(input || "")
    .trim()
    .replace(/[\s-]/g, "");

  if (value.startsWith("+8801")) {
    value = `01${value.slice(5)}`;
  } else if (value.startsWith("8801")) {
    value = `0${value.slice(3)}`;
  }

  return value;
};

const maskLastFour = (value, prefix = "****") => {
  const text = String(value || "");

  if (text.length < 4) {
    return "";
  }

  return `${prefix}${text.slice(-4)}`;
};

const getStoredPayoutValue = (value) => {
  if (!value) return "";

  if (isEncryptedSensitiveValue(value)) {
    return decryptSensitiveValue(value);
  }

  // Legacy value. Only used to build a masked response.
  return String(value);
};

// Never return the complete account number to a seller.
const buildSellerPayoutDetails = (payout) => {
  if (!payout || !payout.method) {
    return {
      configured: false,
      method: "",
    };
  }

  if (payout.method === "bank_transfer") {
    const accountNumber = getStoredPayoutValue(
      payout.accountNumber
    );

    return {
      configured: Boolean(accountNumber),
      method: "bank_transfer",
      bankName: payout.bankName || "",
      branchName: payout.branchName || "",
      routingNumber: payout.routingNumber || "",
      accountHolderName:
        payout.accountHolderName || "",
      maskedAccountNumber:
        maskLastFour(accountNumber),
    };
  }

  if (payout.method === "mfs") {
    const mfsNumber = getStoredPayoutValue(
      payout.mfsNumber
    );

    return {
      configured: Boolean(mfsNumber),
      method: "mfs",
      mfsProvider: payout.mfsProvider || "",
      mfsAccountType: payout.mfsAccountType || "",
      maskedMfsNumber:
        maskLastFour(mfsNumber, "*******"),
    };
  }

  return {
    configured: false,
    method: "",
  };
};

// ======================================================
// GET SELLER PAYOUT DETAILS
// GET /api/seller/payouts/details
// ======================================================

const getSellerPayoutDetails = async (req, res) => {
  try {
    const seller = await User.findById(
      req.user._id
    ).select(PAYOUT_SELECT);

    if (!seller) {
      return res.status(404).json({
        message: "Seller account not found.",
      });
    }

    return res.status(200).json({
      message:
        "Payout details retrieved successfully.",
      payout: buildSellerPayoutDetails(
        seller.payout
      ),
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
// UPDATE SELLER PAYOUT DETAILS
// PUT /api/seller/payouts/details
// ======================================================

const updateSellerPayoutDetails = async (
  req,
  res
) => {
  let session;

  try {
    const payload =
      isPlainObject(req.body?.payout)
        ? req.body.payout
        : req.body;

    if (!isPlainObject(payload)) {
      throw createControllerError(
        400,
        "A valid payout details object is required."
      );
    }

    const method = payload.method;

    if (
      !["bank_transfer", "mfs"].includes(method)
    ) {
      throw createControllerError(
        400,
        "Payout method must be bank_transfer or mfs."
      );
    }

    const allowedFields =
      method === "bank_transfer"
        ? [
            "method",
            "bankName",
            "branchName",
            "routingNumber",
            "accountHolderName",
            "accountNumber",
          ]
        : [
            "method",
            "mfsProvider",
            "mfsAccountType",
            "mfsNumber",
          ];

    const unsupportedFields = Object.keys(
      payload
    ).filter(
      (field) => !allowedFields.includes(field)
    );

    if (unsupportedFields.length > 0) {
      throw createControllerError(
        400,
        `Unsupported payout fields: ${unsupportedFields.join(", ")}`
      );
    }

    let newPayout;

    // ----------------------------------------------
    // BANK TRANSFER VALIDATION
    // ----------------------------------------------

    if (method === "bank_transfer") {
      const bankName = String(
        payload.bankName || ""
      ).trim();

      const branchName = String(
        payload.branchName || ""
      ).trim();

      const routingNumber = String(
        payload.routingNumber || ""
      ).trim();

      const accountHolderName = String(
        payload.accountHolderName || ""
      ).trim();

      const accountNumber = String(
        payload.accountNumber || ""
      ).replace(/\s+/g, "");

      if (
        bankName.length < 2 ||
        bankName.length > 120
      ) {
        throw createControllerError(
          400,
          "Bank name must contain 2–120 characters."
        );
      }

      if (
        branchName.length < 2 ||
        branchName.length > 120
      ) {
        throw createControllerError(
          400,
          "Branch name must contain 2–120 characters."
        );
      }

      if (!/^\d{9}$/.test(routingNumber)) {
        throw createControllerError(
          400,
          "Provide a valid 9-digit bank routing number."
        );
      }

      if (
        accountHolderName.length < 2 ||
        accountHolderName.length > 120
      ) {
        throw createControllerError(
          400,
          "Account holder name must contain 2–120 characters."
        );
      }

      if (
        !/^[A-Za-z0-9-]{6,34}$/.test(accountNumber)
      ) {
        throw createControllerError(
          400,
          "Bank account number must contain 6–34 alphanumeric characters."
        );
      }

      newPayout = {
        method: "bank_transfer",
        bankName,
        branchName,
        routingNumber,
        accountHolderName,

        // Encrypt sensitive account number before saving.
        accountNumber:
          encryptSensitiveValue(accountNumber),

        mfsProvider: "",
        mfsAccountType: "",
        mfsNumber: "",
      };
    }

    // ----------------------------------------------
    // MFS VALIDATION
    // ----------------------------------------------

    if (method === "mfs") {
      const mfsProvider = payload.mfsProvider;
      const mfsAccountType =
        payload.mfsAccountType;

      const mfsNumber = normalizeMfsNumber(
        payload.mfsNumber
      );

      if (
        !["bKash", "Nagad", "Rocket"].includes(
          mfsProvider
        )
      ) {
        throw createControllerError(
          400,
          "Select a valid MFS provider."
        );
      }

      if (
        !["Merchant", "Personal"].includes(
          mfsAccountType
        )
      ) {
        throw createControllerError(
          400,
          "MFS account type must be Merchant or Personal."
        );
      }

      if (!/^01[3-9]\d{8}$/.test(mfsNumber)) {
        throw createControllerError(
          400,
          "Provide a valid Bangladesh mobile wallet number."
        );
      }

      newPayout = {
        method: "mfs",
        bankName: "",
        branchName: "",
        routingNumber: "",
        accountHolderName: "",
        accountNumber: "",

        mfsProvider,
        mfsAccountType,

        // Encrypt the MFS wallet number before saving.
        mfsNumber:
          encryptSensitiveValue(mfsNumber),
      };
    }

    // ----------------------------------------------
    // SAVE PAYOUT DETAILS AND AUDIT ATOMICALLY
    // ----------------------------------------------

    session = await mongoose.startSession();

    let savedPayoutDetails = null;

    await session.withTransaction(async () => {
      const seller = await User.findById(
        req.user._id
      )
        .select(PAYOUT_SELECT)
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
        seller.verificationStatus !== "approved" ||
        seller.status !== "active"
      ) {
        throw createControllerError(
          403,
          "Only active, approved sellers can update payout details."
        );
      }

      const before = buildSellerPayoutDetails(
        seller.payout
      );

      seller.set("payout", newPayout);

      await seller.save({ session });

      const after = buildSellerPayoutDetails(
        seller.payout
      );

      await writeAuditLog({
        actorRole: "seller",
        actorId: seller._id,
        action: "SELLER_PAYOUT_DETAILS_UPDATED",
        targetType: "User",
        targetId: seller._id,
        changes: {
          before,
          after,
        },
        note:
          "Seller updated payout destination details.",
        session,
      });

      savedPayoutDetails = after;
    });

    return res.status(200).json({
      message:
        "Payout details saved securely.",
      payout: savedPayoutDetails,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to save payout details."
    );
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// ======================================================
// GET SELLER PAYOUT SUMMARY
// GET /api/seller/payouts/summary
// ======================================================

const getSellerPayoutSummary = async (
  req,
  res
) => {
  try {
    await refreshMaturedPayouts();

    const result = await Payout.aggregate([
      {
        $match: {
          sellerId: new mongoose.Types.ObjectId(
            req.user._id
          ),
        },
      },
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
        "Payout summary retrieved successfully.",
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
// GET SELLER PAYOUT HISTORY
// GET /api/seller/payouts/history
// ======================================================

const getSellerPayoutHistory = async (
  req,
  res
) => {
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

    const filter = {
      sellerId: req.user._id,
    };

    if (req.query.status) {
      if (
        !ALLOWED_PAYOUT_STATUSES.includes(
          req.query.status
        )
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
            "orderId",
            "createdAt status totalAmount"
          )
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),

        Payout.countDocuments(filter),
      ]);

    return res.status(200).json({
      message:
        "Payout history retrieved successfully.",
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
      "Unable to retrieve payout history."
    );
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  getSellerPayoutDetails,
  updateSellerPayoutDetails,
  getSellerPayoutSummary,
  getSellerPayoutHistory,
};