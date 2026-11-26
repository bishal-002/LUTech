const mongoose = require("mongoose");
const sanitizeHtml = require("sanitize-html");

const Refund = require("../models/Refund");

const {
  writeAuditLog,
} = require("../services/auditLogService");

const {
  isEncryptedSensitiveValue,
  decryptSensitiveValue,
} = require("../services/payoutEncryptionService");

const createControllerError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const handleError = (res, error, fallbackMessage) => {
  const statusCode =
    error.statusCode ||
    (error.name === "ValidationError" || error.name === "CastError"
      ? 400
      : error.code === 11000
        ? 409
        : 500);

  if (statusCode === 500) {
    console.error(fallbackMessage, error);
  }

  return res.status(statusCode).json({
    message: statusCode === 500 ? fallbackMessage : error.message,
  });
};

const cleanText = (value) =>
  sanitizeHtml(String(value || ""), {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();

const getAdminRefunds = async (req, res) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );

    const filter = {};

    if (req.query.status) {
      if (
        !["approved", "completed", "failed"].includes(
          req.query.status
        )
      ) {
        return res.status(400).json({
          message: "Invalid refund status filter.",
        });
      }

      filter.status = req.query.status;
    }

    const [refunds, total] = await Promise.all([
      Refund.find(filter)
        .populate("customerId", "name email")
        .populate("sellerId", "name email storeName")
        .populate("orderId", "createdAt status totalAmount")
        .populate("disputeId", "caseNumber reason status")
        .populate("processedBy", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),

      Refund.countDocuments(filter),
    ]);

    return res.status(200).json({
      refunds,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRefunds: total,
        limit,
      },
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to retrieve refunds."
    );
  }
};

const getAdminRefundById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid refund ID.",
      });
    }

    const refund = await Refund.findById(req.params.id)
      .select("+refundDestination")
      .populate("customerId", "name email")
      .populate("sellerId", "name email storeName")
      .populate("orderId", "createdAt status totalAmount")
      .populate(
        "disputeId",
        "caseNumber reason description status items"
      )
      .populate("processedBy", "name email");

    if (!refund) {
      return res.status(404).json({
        message: "Refund not found.",
      });
    }

    const safeRefund = refund.toObject();
    let refundDestination = null;

    if (refund.refundDestination?.method === "bank_transfer") {
      if (
        !isEncryptedSensitiveValue(
          refund.refundDestination.accountNumber
        )
      ) {
        throw createControllerError(
          409,
          "The customer's refund bank details are not encrypted correctly."
        );
      }

      const accountNumber = decryptSensitiveValue(
        refund.refundDestination.accountNumber
      );

      refundDestination = {
        method: "bank_transfer",
        bankName: refund.refundDestination.bankName,
        branchName: refund.refundDestination.branchName,
        routingNumber: refund.refundDestination.routingNumber,
        accountHolderName:
          refund.refundDestination.accountHolderName,
        accountNumber,
        maskedAccountNumber: `****${accountNumber.slice(-4)}`,
      };
    } else if (refund.refundDestination?.method === "mfs") {
      if (
        !isEncryptedSensitiveValue(
          refund.refundDestination.mfsNumber
        )
      ) {
        throw createControllerError(
          409,
          "The customer's refund MFS details are not encrypted correctly."
        );
      }

      const mfsNumber = decryptSensitiveValue(
        refund.refundDestination.mfsNumber
      );

      refundDestination = {
        method: "mfs",
        mfsProvider: refund.refundDestination.mfsProvider,
        mfsAccountType: refund.refundDestination.mfsAccountType,
        mfsNumber,
        maskedMfsNumber: `*******${mfsNumber.slice(-4)}`,
      };
    }

    // Never return the encrypted destination field as part of the
    // ordinary refund object. Return the decrypted destination separately.
    delete safeRefund.refundDestination;

    return res.status(200).json({
      refund: safeRefund,
      refundDestination,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to retrieve the refund."
    );
  }
};

// A COD refund is not automatic. An administrator records the
// completed bank/MFS transfer and its reference here.
const completeAdminRefund = async (req, res) => {
  let session;

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid refund ID.",
      });
    }

    const paymentMethod = req.body.paymentMethod;
    const transactionReference = cleanText(
      req.body.transactionReference
    );
    const note = cleanText(req.body.note);

    if (!["bank_transfer", "mfs"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "paymentMethod must be bank_transfer or mfs.",
      });
    }

    if (
      transactionReference.length < 3 ||
      transactionReference.length > 120 ||
      /[\r\n]/.test(transactionReference)
    ) {
      return res.status(400).json({
        message:
          "A bank/MFS transaction reference between 3 and 120 characters is required.",
      });
    }

    if (note.length < 5 || note.length > 500) {
      return res.status(400).json({
        message:
          "A completion note between 5 and 500 characters is required.",
      });
    }

    session = await mongoose.startSession();
    let refundId = null;

    await session.withTransaction(async () => {
      const refund = await Refund.findById(req.params.id)
        .select("+refundDestination")
        .session(session);

      if (!refund) {
        throw createControllerError(404, "Refund not found.");
      }

      if (refund.status === "completed") {
        throw createControllerError(
          409,
          "This refund has already been completed."
        );
      }

      if (!["approved", "failed"].includes(refund.status)) {
        throw createControllerError(
          409,
          "Only approved or previously failed refunds can be completed."
        );
      }

      if (refund.refundDestination?.method !== paymentMethod) {
        throw createControllerError(
          409,
          "The transfer method must match the customer's encrypted refund destination."
        );
      }

      const before = {
        status: refund.status,
        paymentMethod: refund.paymentMethod,
        transactionReference: refund.transactionReference || "",
      };

      refund.status = "completed";
      refund.paymentMethod = paymentMethod;
      refund.transactionReference =
        transactionReference || undefined;
      refund.processedBy = req.user._id;
      refund.processedAt = new Date();
      refund.processingNote = note;
      refund.failureReason = "";

      await refund.save({ session });

      await writeAuditLog({
        adminId: req.user._id,
        action: "MANUAL_REFUND_ISSUED",
        targetType: "Refund",
        targetId: refund._id,
        changes: {
          before,
          after: {
            status: refund.status,
            approvedAmount: refund.approvedAmount,
            paymentMethod: refund.paymentMethod,
            transactionReference:
              refund.transactionReference || "",
            processedAt: refund.processedAt,
          },
        },
        note,
        session,
      });

      refundId = refund._id;
    });

    const refund = await Refund.findById(refundId)
      .populate("customerId", "name email")
      .populate("sellerId", "name email storeName")
      .populate("orderId", "createdAt status totalAmount")
      .populate("disputeId", "caseNumber status")
      .populate("processedBy", "name email");

    return res.status(200).json({
      message: "Manual refund transfer recorded as completed.",
      refund,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to complete the refund."
    );
  } finally {
    if (session) await session.endSession();
  }
};

const markAdminRefundFailed = async (req, res) => {
  let session;

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid refund ID.",
      });
    }

    const failureReason = cleanText(req.body.failureReason);

    if (
      failureReason.length < 5 ||
      failureReason.length > 500
    ) {
      return res.status(400).json({
        message:
          "A failure reason between 5 and 500 characters is required.",
      });
    }

    session = await mongoose.startSession();
    let refundId = null;

    await session.withTransaction(async () => {
      const refund = await Refund.findById(req.params.id)
        .select("+refundDestination")
        .session(session);

      if (!refund) {
        throw createControllerError(404, "Refund not found.");
      }

      if (refund.status === "completed") {
        throw createControllerError(
          409,
          "A completed refund cannot be marked as failed."
        );
      }

      if (refund.status !== "approved") {
        throw createControllerError(
          409,
          "Only an approved refund can be marked as failed."
        );
      }

      const before = {
        status: refund.status,
      };

      refund.status = "failed";
      refund.failureReason = failureReason;
      refund.processedBy = req.user._id;

      await refund.save({ session });

      await writeAuditLog({
        adminId: req.user._id,
        action: "REFUND_MARKED_FAILED",
        targetType: "Refund",
        targetId: refund._id,
        changes: {
          before,
          after: {
            status: refund.status,
            failureReason,
          },
        },
        note: failureReason,
        session,
      });

      refundId = refund._id;
    });

    const refund = await Refund.findById(refundId);

    return res.status(200).json({
      message:
        "Refund marked as failed. The approved refund can be retried after the transfer issue is resolved.",
      refund,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to update the refund status."
    );
  } finally {
    if (session) await session.endSession();
  }
};

module.exports = {
  getAdminRefunds,
  getAdminRefundById,
  completeAdminRefund,
  markAdminRefundFailed,
};