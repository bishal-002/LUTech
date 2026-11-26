const mongoose = require("mongoose");
const sanitizeHtml = require("sanitize-html");

const Order = require("../models/Order");
const Payout = require("../models/Payout");
const Dispute = require("../models/Dispute");
const Refund = require("../models/Refund");
const SellerRecovery = require("../models/SellerRecovery");

const {
  getPlatformSettings,
} = require("../services/platformSettingsService");

const {
  writeAuditLog,
} = require("../services/auditLogService");

const {
  encryptSensitiveValue,
} = require("../services/payoutEncryptionService");

const {
  ACTIVE_DISPUTE_STATUSES,
  DISPUTE_STATUSES,
} = require("../models/Dispute");

const DISPUTE_WINDOW_DAYS = 30;
const MAX_PAGE_SIZE = 100;

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

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

const parsePagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(query.limit, 10) || 20)
  );

  return { page, limit, skip: (page - 1) * limit };
};

const sanitizeText = (value) =>
  sanitizeHtml(String(value || ""), {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();

const isPlainObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

// Encrypt customer bank/MFS details before they enter MongoDB.
const buildEncryptedRefundDestination = (input) => {
  if (!isPlainObject(input)) {
    throw createControllerError(
      400,
      "Provide a refundDestination object with bank or MFS details."
    );
  }

  const method = input.method;

  if (method === "bank_transfer") {
    const bankName = sanitizeText(input.bankName);
    const accountHolderName = sanitizeText(input.accountHolderName);
    const accountNumber = sanitizeText(input.accountNumber).replace(/\s+/g, "");
    const branchName = sanitizeText(input.branchName);
    const routingNumber = sanitizeText(input.routingNumber).replace(/\s+/g, "");

    if (!bankName || bankName.length > 100) {
      throw createControllerError(
        400,
        "Provide a valid bank name (maximum 100 characters)."
      );
    }

    if (!accountHolderName || accountHolderName.length > 120) {
      throw createControllerError(
        400,
        "Provide a valid bank account holder name."
      );
    }

    if (!/^[A-Za-z0-9-]{4,40}$/.test(accountNumber)) {
      throw createControllerError(
        400,
        "Bank account number must contain 4 to 40 letters, numbers, or hyphens."
      );
    }

    if (branchName.length > 100 || routingNumber.length > 40) {
      throw createControllerError(
        400,
        "Bank branch or routing details are too long."
      );
    }

    return {
      method: "bank_transfer",
      bankName,
      branchName,
      routingNumber,
      accountHolderName,
      accountNumber: encryptSensitiveValue(accountNumber),
      destinationLast4: accountNumber.slice(-4),
      mfsProvider: "",
      mfsAccountType: "",
      mfsNumber: undefined,
    };
  }

  if (method === "mfs") {
    const mfsProvider = input.mfsProvider;
    const mfsAccountType = input.mfsAccountType;
    const mfsNumber = sanitizeText(input.mfsNumber).replace(/\D/g, "");

    if (!["bKash", "Nagad", "Rocket"].includes(mfsProvider)) {
      throw createControllerError(
        400,
        "Select a supported MFS provider: bKash, Nagad, or Rocket."
      );
    }

    if (!["Merchant", "Personal"].includes(mfsAccountType)) {
      throw createControllerError(
        400,
        "MFS account type must be Merchant or Personal."
      );
    }

    if (!/^01[3-9]\d{8}$/.test(mfsNumber)) {
      throw createControllerError(
        400,
        "Provide a valid Bangladesh MFS mobile number."
      );
    }

    return {
      method: "mfs",
      bankName: "",
      branchName: "",
      routingNumber: "",
      accountHolderName: "",
      accountNumber: undefined,
      destinationLast4: mfsNumber.slice(-4),
      mfsProvider,
      mfsAccountType,
      mfsNumber: encryptSensitiveValue(mfsNumber),
    };
  }

  throw createControllerError(
    400,
    "refundDestination.method must be bank_transfer or mfs."
  );
};

const getOrderItemKey = (productId, variantId) =>
  `${String(productId)}:${String(variantId)}`;

// Calculate claim value entirely from the immutable order snapshot.
// Shipping is excluded. The order discount is allocated proportionally
// across the selected merchandise lines.
const calculateDisputeItems = (order, submittedItems) => {
  if (
    !Array.isArray(submittedItems) ||
    submittedItems.length < 1 ||
    submittedItems.length > 50
  ) {
    throw createControllerError(
      400,
      "Select between 1 and 50 order items for this dispute."
    );
  }

  const seen = new Set();
  const selected = [];
  const orderSubtotal = Number(order.subtotal || 0);
  const allocatableDiscount = Math.min(
    Math.max(0, Number(order.discount || 0)),
    orderSubtotal
  );

  for (const submitted of submittedItems) {
    const productId = String(submitted?.productId || "");
    const variantId = String(submitted?.variantId || "");
    const quantity = Number(submitted?.quantity);

    if (
      !mongoose.isValidObjectId(productId) ||
      !mongoose.isValidObjectId(variantId)
    ) {
      throw createControllerError(
        400,
        "Each disputed item must include a valid productId and variantId."
      );
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw createControllerError(
        400,
        "Disputed item quantity must be a positive whole number."
      );
    }

    const key = getOrderItemKey(productId, variantId);

    if (seen.has(key)) {
      throw createControllerError(
        400,
        "The same product variant cannot be repeated in the dispute item list."
      );
    }

    seen.add(key);

    const orderItem = order.items.find(
      (item) =>
        String(item.productId) === productId &&
        String(item.variantId) === variantId
    );

    if (!orderItem) {
      throw createControllerError(
        400,
        "A selected product variant does not belong to this order."
      );
    }

    if (quantity > Number(orderItem.quantity)) {
      throw createControllerError(
        400,
        `The requested quantity for ${orderItem.snapshot?.title || orderItem.name} exceeds the purchased quantity.`
      );
    }

    const unitPrice = Number(orderItem.unitPrice ?? orderItem.price);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw createControllerError(
        409,
        "The order contains an invalid item price snapshot."
      );
    }

    const lineAmount = roundMoney(unitPrice * quantity);

    selected.push({
      productId: orderItem.productId,
      variantId: orderItem.variantId,
      title:
        orderItem.snapshot?.title ||
        orderItem.name ||
        "Order item",
      sku: orderItem.snapshot?.sku || "",
      image:
        orderItem.snapshot?.image ||
        orderItem.image ||
        "",
      quantity,
      unitPrice,
      lineAmount,
      refundableAmount: lineAmount,
    });
  }

  // Allocate the order-level discount to the selected lines in integer
  // paisa. The largest-remainder method makes the line allocations add up
  // exactly to the selected portion's aggregate discount share.
  const orderSubtotalPaisa = Math.round(roundMoney(orderSubtotal) * 100);
  const discountPaisa = Math.round(roundMoney(allocatableDiscount) * 100);
  const linePaisa = selected.map((item) => Math.round(item.lineAmount * 100));
  const selectedLinePaisa = linePaisa.reduce(
    (total, value) => total + value,
    0
  );

  const selectedDiscountPaisa =
    orderSubtotalPaisa > 0
      ? Math.min(
          selectedLinePaisa,
          Math.round(
            (discountPaisa * selectedLinePaisa) / orderSubtotalPaisa
          )
        )
      : 0;

  const discountAllocations = linePaisa.map((value, index) => {
    const rawShare =
      orderSubtotalPaisa > 0
        ? (discountPaisa * value) / orderSubtotalPaisa
        : 0;

    const baseShare = Math.floor(rawShare);

    return {
      index,
      paisa: baseShare,
      remainder: rawShare - baseShare,
    };
  });

  let unallocatedPaisa =
    selectedDiscountPaisa -
    discountAllocations.reduce(
      (total, allocation) => total + allocation.paisa,
      0
    );

  discountAllocations
    .slice()
    .sort(
      (a, b) =>
        b.remainder - a.remainder || a.index - b.index
    )
    .forEach((allocation) => {
      if (unallocatedPaisa > 0) {
        discountAllocations[allocation.index].paisa += 1;
        unallocatedPaisa -= 1;
      }
    });

  selected.forEach((item, index) => {
    item.refundableAmount = roundMoney(
      Math.max(
        0,
        (linePaisa[index] - discountAllocations[index].paisa) / 100
      )
    );
  });

  const requestedRefundAmount = roundMoney(
    selected.reduce(
      (total, item) => total + item.refundableAmount,
      0
    )
  );

  return { items: selected, requestedRefundAmount };
};

const releaseDisputePayoutHold = async (orderId, session) => {
  const payout = await Payout.findOne({ orderId }).session(session);

  if (
    !payout ||
    payout.status === "paid" ||
    payout.status === "cancelled"
  ) {
    return payout;
  }

  payout.disputeHold = false;

  if (payout.status === "on_hold") {
    payout.status =
      payout.eligibleAt.getTime() <= Date.now()
        ? "available"
        : "on_hold";
  }

  await payout.save({ session });
  return payout;
};

const populateDispute = (query) =>
  query
    .populate(
      "orderId",
      "createdAt deliveredAt status paymentMethod paymentStatus totalAmount"
    )
    .populate("customerId", "name email")
    .populate("sellerId", "name email storeName storeSlug")
    .populate("resolution.resolvedBy", "name email")
    .populate("messages.senderId", "name email role");

// ======================================================
// CUSTOMER: OPEN A DISPUTE
// POST /api/disputes
// ======================================================

const createCustomerDispute = async (req, res) => {
  let session;

  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({
        message: "Only customer accounts can open an order dispute.",
      });
    }

    const { orderId, reason, requestedResolution } = req.body;
    const description = sanitizeText(req.body.description);

    const refundDestination = req.body.refundDestination
      ? buildEncryptedRefundDestination(req.body.refundDestination)
      : null;

    if (requestedResolution === "refund" && !refundDestination) {
      return res.status(400).json({
        message:
          "A bank transfer or MFS refund destination is required when requesting a refund.",
      });
    }

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({
        message: "A valid orderId is required.",
      });
    }

    if (!Dispute.DISPUTE_REASONS.includes(reason)) {
      return res.status(400).json({
        message: "Select a valid dispute reason.",
      });
    }

    if (!["refund", "replacement"].includes(requestedResolution)) {
      return res.status(400).json({
        message: "requestedResolution must be refund or replacement.",
      });
    }

    if (description.length < 20 || description.length > 3000) {
      return res.status(400).json({
        message:
          "Describe the issue in at least 20 and no more than 3000 characters.",
      });
    }

    session = await mongoose.startSession();
    let disputeId = null;

    await session.withTransaction(async () => {
      const order = await Order.findOne({
        _id: orderId,
        customerId: req.user._id,
      }).session(session);

      if (!order) {
        throw createControllerError(404, "Order not found.");
      }

      if (
        order.status !== "delivered" ||
        order.paymentStatus !== "paid"
      ) {
        throw createControllerError(
          409,
          "A dispute can only be opened for a delivered and paid order."
        );
      }

      const deliveredAt =
        order.deliveredAt || order.updatedAt || order.createdAt;

      const ageInDays =
        (Date.now() - new Date(deliveredAt).getTime()) /
        (24 * 60 * 60 * 1000);

      if (
        !Number.isFinite(ageInDays) ||
        ageInDays < 0 ||
        ageInDays > DISPUTE_WINDOW_DAYS
      ) {
        throw createControllerError(
          409,
          `The ${DISPUTE_WINDOW_DAYS}-day dispute window for this order has expired.`
        );
      }

      const existing = await Dispute.findOne({
        orderId: order._id,
      }).session(session);

      if (existing) {
        throw createControllerError(
          409,
          `A dispute (${existing.caseNumber}) has already been opened for this order.`
        );
      }

      const { items, requestedRefundAmount } =
        calculateDisputeItems(order, req.body.items);

      const [dispute] = await Dispute.create(
        [
          {
            orderId: order._id,
            customerId: order.customerId,
            sellerId: order.sellerId,
            reason,
            description,
            requestedResolution,
            items,
            requestedRefundAmount,
            hasRefundDestination: Boolean(refundDestination),
            refundDestination: refundDestination || undefined,
            status: "awaiting_seller",
          },
        ],
        { session }
      );

      // Freeze an unpaid payout while the case is active.
      const payout = await Payout.findOne({
        orderId: order._id,
      }).session(session);

      if (
        payout &&
        ["on_hold", "available"].includes(payout.status)
      ) {
        payout.disputeHold = true;
        payout.status = "on_hold";
        await payout.save({ session });
      }

      await writeAuditLog({
        actorId: req.user._id,
        actorRole: "customer",
        action: "DISPUTE_OPENED",
        targetType: "Dispute",
        targetId: dispute._id,
        changes: {
          before: null,
          after: {
            caseNumber: dispute.caseNumber,
            orderId: order._id.toString(),
            reason,
            requestedResolution,
            requestedRefundAmount: dispute.requestedRefundAmount,
            status: dispute.status,
          },
        },
        session,
      });

      disputeId = dispute._id;
    });

    const dispute = await populateDispute(
      Dispute.findById(disputeId)
    );

    return res.status(201).json({
      message: "Your dispute has been opened and sent to the seller.",
      dispute,
      policy: {
        disputeWindowDays: DISPUTE_WINDOW_DAYS,
        refundCalculation:
          "Selected item value after proportional order discount; shipping is excluded.",
      },
    });
  } catch (error) {
    return handleError(res, error, "Unable to open the dispute.");
  } finally {
    if (session) await session.endSession();
  }
};

// ======================================================
// CUSTOMER / SELLER / ADMIN: LIST AND DETAIL
// ======================================================

const getCustomerDisputes = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { customerId: req.user._id };

    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .select("-messages")
        .populate("orderId", "createdAt deliveredAt status totalAmount")
        .populate("sellerId", "name storeName storeSlug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Dispute.countDocuments(filter),
    ]);

    return res.status(200).json({
      disputes,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalDisputes: total,
        limit,
      },
    });
  } catch (error) {
    return handleError(res, error, "Unable to retrieve your disputes.");
  }
};

const getCustomerDisputeById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid dispute ID.",
      });
    }

    const dispute = await populateDispute(
      Dispute.findOne({
        _id: req.params.id,
        customerId: req.user._id,
      })
    );

    if (!dispute) {
      return res.status(404).json({
        message: "Dispute not found.",
      });
    }

    const refund = dispute.refundId
      ? await Refund.findById(dispute.refundId).select(
          "approvedAmount status paymentMethod transactionReference processedAt processingNote failureReason"
        )
      : null;

    return res.status(200).json({ dispute, refund });
  } catch (error) {
    return handleError(res, error, "Unable to retrieve the dispute.");
  }
};

const getSellerDisputes = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { sellerId: req.user._id };

    if (req.query.status) {
      if (!DISPUTE_STATUSES.includes(req.query.status)) {
        return res.status(400).json({
          message: "Invalid dispute status filter.",
        });
      }

      filter.status = req.query.status;
    }

    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .select("-messages")
        .populate("orderId", "createdAt deliveredAt status totalAmount")
        .populate("customerId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Dispute.countDocuments(filter),
    ]);

    return res.status(200).json({
      disputes,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalDisputes: total,
        limit,
      },
    });
  } catch (error) {
    return handleError(res, error, "Unable to retrieve seller disputes.");
  }
};

const getSellerDisputeById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid dispute ID.",
      });
    }

    const dispute = await populateDispute(
      Dispute.findOne({
        _id: req.params.id,
        sellerId: req.user._id,
      })
    );

    if (!dispute) {
      return res.status(404).json({
        message: "Dispute not found.",
      });
    }

    return res.status(200).json({ dispute });
  } catch (error) {
    return handleError(res, error, "Unable to retrieve the dispute.");
  }
};

const getAdminDisputes = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    if (req.query.status) {
      if (!DISPUTE_STATUSES.includes(req.query.status)) {
        return res.status(400).json({
          message: "Invalid dispute status filter.",
        });
      }

      filter.status = req.query.status;
    }

    if (req.query.reason) {
      if (!Dispute.DISPUTE_REASONS.includes(req.query.reason)) {
        return res.status(400).json({
          message: "Invalid dispute reason filter.",
        });
      }

      filter.reason = req.query.reason;
    }

    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .select("-messages")
        .populate(
          "orderId",
          "createdAt deliveredAt status paymentStatus totalAmount"
        )
        .populate("customerId", "name email")
        .populate("sellerId", "name email storeName storeSlug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Dispute.countDocuments(filter),
    ]);

    return res.status(200).json({
      disputes,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalDisputes: total,
        limit,
      },
    });
  } catch (error) {
    return handleError(res, error, "Unable to retrieve disputes.");
  }
};

const getAdminDisputeById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid dispute ID.",
      });
    }

    const dispute = await populateDispute(
      Dispute.findById(req.params.id)
    );

    if (!dispute) {
      return res.status(404).json({
        message: "Dispute not found.",
      });
    }

    const refund = dispute.refundId
      ? await Refund.findById(dispute.refundId)
      : null;

    return res.status(200).json({ dispute, refund });
  } catch (error) {
    return handleError(res, error, "Unable to retrieve the dispute.");
  }
};

// ======================================================
// CUSTOMER: ADD OR UPDATE ENCRYPTED REFUND DESTINATION
// PATCH /api/disputes/:id/refund-destination
// ======================================================

const updateCustomerRefundDestination = async (req, res) => {
  let session;

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid dispute ID.",
      });
    }

    if (req.user.role !== "customer") {
      return res.status(403).json({
        message: "Customer access only.",
      });
    }

    const encryptedDestination = buildEncryptedRefundDestination(
      req.body.refundDestination
    );

    session = await mongoose.startSession();
    let disputeId = null;

    await session.withTransaction(async () => {
      const dispute = await Dispute.findOne({
        _id: req.params.id,
        customerId: req.user._id,
      })
        .select("+refundDestination")
        .session(session);

      if (!dispute) {
        throw createControllerError(404, "Dispute not found.");
      }

      if (ACTIVE_DISPUTE_STATUSES.includes(dispute.status)) {
        const previousMethod =
          dispute.refundDestination?.method || "";

        const previousLast4 =
          dispute.refundDestination?.destinationLast4 || "";

        dispute.refundDestination = encryptedDestination;
        dispute.hasRefundDestination = true;

        await dispute.save({ session });

        await writeAuditLog({
          actorId: req.user._id,
          actorRole: "customer",
          action: "REFUND_DESTINATION_UPDATED",
          targetType: "Dispute",
          targetId: dispute._id,
          changes: {
            before: {
              method: previousMethod,
              destinationLast4: previousLast4,
            },
            after: {
              method: encryptedDestination.method,
              destinationLast4: encryptedDestination.destinationLast4,
            },
          },
          note: "Customer securely updated the refund destination.",
          session,
        });
      } else {
        // Once a refund transfer has failed, allow the customer to correct
        // the destination without reopening the adjudicated dispute.
        if (!dispute.refundId) {
          throw createControllerError(
            409,
            "The refund destination can only be changed while the dispute is active or after an approved refund transfer has failed."
          );
        }

        const refund = await Refund.findOne({
          _id: dispute.refundId,
          customerId: req.user._id,
        })
          .select("+refundDestination")
          .session(session);

        if (!refund || refund.status !== "failed") {
          throw createControllerError(
            409,
            "A refund destination can only be changed after the refund transfer has been marked as failed."
          );
        }

        const previousMethod =
          refund.refundDestination?.method || "";

        const previousLast4 =
          refund.refundDestination?.destinationLast4 || "";

        refund.refundDestination = encryptedDestination;
        await refund.save({ session });

        dispute.refundDestination = encryptedDestination;
        dispute.hasRefundDestination = true;
        await dispute.save({ session });

        await writeAuditLog({
          actorId: req.user._id,
          actorRole: "customer",
          action: "REFUND_DESTINATION_UPDATED",
          targetType: "Refund",
          targetId: refund._id,
          changes: {
            before: {
              method: previousMethod,
              destinationLast4: previousLast4,
            },
            after: {
              method: encryptedDestination.method,
              destinationLast4: encryptedDestination.destinationLast4,
            },
          },
          note:
            "Customer updated the refund destination after a failed transfer.",
          session,
        });
      }

      disputeId = dispute._id;
    });

    const dispute = await populateDispute(
      Dispute.findById(disputeId)
    );

    return res.status(200).json({
      message: "Refund destination saved securely.",
      dispute,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to save the refund destination."
    );
  } finally {
    if (session) await session.endSession();
  }
};

// ======================================================
// MESSAGES
// ======================================================

const addDisputeMessage = async (req, res) => {
  let session;

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid dispute ID.",
      });
    }

    const message = sanitizeText(req.body.message);

    if (!message || message.length > 2000) {
      return res.status(400).json({
        message: "A message between 1 and 2000 characters is required.",
      });
    }

    if (!["customer", "seller", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "This account cannot message a dispute.",
      });
    }

    session = await mongoose.startSession();
    let updatedId = null;

    await session.withTransaction(async () => {
      const dispute = await Dispute.findById(req.params.id).session(session);

      if (!dispute) {
        throw createControllerError(404, "Dispute not found.");
      }

      if (!ACTIVE_DISPUTE_STATUSES.includes(dispute.status)) {
        throw createControllerError(
          409,
          "This dispute is closed to new messages."
        );
      }

      if (
        req.user.role === "customer" &&
        String(dispute.customerId) !== String(req.user._id)
      ) {
        throw createControllerError(404, "Dispute not found.");
      }

      if (
        req.user.role === "seller" &&
        String(dispute.sellerId) !== String(req.user._id)
      ) {
        throw createControllerError(404, "Dispute not found.");
      }

      if (dispute.messages.length >= 200) {
        throw createControllerError(
          409,
          "This dispute has reached its message limit."
        );
      }

      const beforeStatus = dispute.status;

      dispute.messages.push({
        senderId: req.user._id,
        senderRole: req.user.role,
        message,
      });

      if (req.user.role === "seller") {
        dispute.sellerRespondedAt = new Date();

        if (dispute.status === "awaiting_seller") {
          dispute.status = "under_review";
        }
      } else if (
        req.user.role === "customer" &&
        dispute.status === "awaiting_customer"
      ) {
        dispute.status = "under_review";
      }

      await dispute.save({ session });

      await writeAuditLog({
        actorId: req.user._id,
        actorRole: req.user.role,
        action:
          req.user.role === "seller"
            ? "DISPUTE_SELLER_RESPONDED"
            : "DISPUTE_MESSAGE_ADDED",
        targetType: "Dispute",
        targetId: dispute._id,
        changes: {
          before: { status: beforeStatus },
          after: {
            status: dispute.status,
            messageId:
              dispute.messages[
                dispute.messages.length - 1
              ]._id.toString(),
          },
        },
        session,
      });

      updatedId = dispute._id;
    });

    const dispute = await populateDispute(
      Dispute.findById(updatedId)
    );

    return res.status(201).json({
      message: "Dispute message added successfully.",
      dispute,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to add the dispute message."
    );
  } finally {
    if (session) await session.endSession();
  }
};

// ======================================================
// ADMIN: STATUS AND FINAL DECISION
// ======================================================

const updateAdminDisputeStatus = async (req, res) => {
  let session;

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid dispute ID.",
      });
    }

    const allowedStatuses = [
      "under_review",
      "awaiting_customer",
      "awaiting_seller",
    ];

    const status = req.body.status;
    const note = sanitizeText(req.body.note);

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message:
          "Admin status updates may use under_review, awaiting_customer, or awaiting_seller.",
      });
    }

    if (note.length < 5 || note.length > 500) {
      return res.status(400).json({
        message: "An internal note between 5 and 500 characters is required.",
      });
    }

    session = await mongoose.startSession();
    let updatedId = null;

    await session.withTransaction(async () => {
      const dispute = await Dispute.findById(req.params.id).session(session);

      if (!dispute) {
        throw createControllerError(404, "Dispute not found.");
      }

      if (!ACTIVE_DISPUTE_STATUSES.includes(dispute.status)) {
        throw createControllerError(
          409,
          "A resolved or rejected dispute cannot be reopened here."
        );
      }

      const before = { status: dispute.status };

      dispute.status = status;
      await dispute.save({ session });

      await writeAuditLog({
        adminId: req.user._id,
        action: "DISPUTE_STATUS_UPDATED",
        targetType: "Dispute",
        targetId: dispute._id,
        changes: {
          before,
          after: { status },
        },
        note,
        session,
      });

      updatedId = dispute._id;
    });

    const dispute = await populateDispute(
      Dispute.findById(updatedId)
    );

    return res.status(200).json({
      message: "Dispute status updated.",
      dispute,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to update dispute status."
    );
  } finally {
    if (session) await session.endSession();
  }
};

const resolveAdminDispute = async (req, res) => {
  let session;

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid dispute ID.",
      });
    }

    if (
      req.body.decision === "refund" &&
      !req.adminProfile?.permissions?.includes("issue_refunds")
    ) {
      return res.status(403).json({
        message: "You do not have permission to approve customer refunds.",
        requiredPermission: "issue_refunds",
      });
    }

    const decision = req.body.decision;
    const note = sanitizeText(req.body.note);

    if (!["refund", "replacement", "rejected"].includes(decision)) {
      return res.status(400).json({
        message: "decision must be refund, replacement, or rejected.",
      });
    }

    if (note.length < 10 || note.length > 500) {
      return res.status(400).json({
        message: "A resolution note between 10 and 500 characters is required.",
      });
    }

    let approvedAmount = 0;

    if (decision === "refund") {
      approvedAmount =
        req.body.approvedAmount === undefined
          ? null
          : Number(req.body.approvedAmount);

      if (
        approvedAmount !== null &&
        (!Number.isFinite(approvedAmount) || approvedAmount <= 0)
      ) {
        return res.status(400).json({
          message: "approvedAmount must be a positive amount.",
        });
      }
    }

    session = await mongoose.startSession();
    let resultIds = null;

    await session.withTransaction(async () => {
      const dispute = await Dispute.findById(req.params.id)
        .select("+refundDestination")
        .session(session);

      if (!dispute) {
        throw createControllerError(404, "Dispute not found.");
      }

      if (!ACTIVE_DISPUTE_STATUSES.includes(dispute.status)) {
        throw createControllerError(
          409,
          "This dispute has already received a final decision."
        );
      }

      const before = {
        status: dispute.status,
        refundId: dispute.refundId,
      };

      const now = new Date();
      let refund = null;

      if (decision === "refund") {
        if (!dispute.refundDestination) {
          throw createControllerError(
            409,
            "The customer has not saved a refund destination. Ask the customer to add bank/MFS details before approving a refund."
          );
        }

        const amount =
          approvedAmount === null
            ? Number(dispute.requestedRefundAmount)
            : roundMoney(approvedAmount);

        if (
          !Number.isFinite(amount) ||
          amount <= 0 ||
          amount > Number(dispute.requestedRefundAmount) + 0.001
        ) {
          throw createControllerError(
            400,
            "The approved refund must be greater than zero and cannot exceed the requested refundable amount."
          );
        }

        const order = await Order.findById(dispute.orderId)
          .select("+commissionRateSnapshot")
          .session(session);

        if (!order || order.paymentStatus !== "paid") {
          throw createControllerError(
            409,
            "The paid order could not be verified for refund approval."
          );
        }

        const payout = await Payout.findOne({
          orderId: dispute.orderId,
        }).session(session);

        const settings = await getPlatformSettings({ session });

        const rawRate = payout
          ? payout.commissionRate
          : order.commissionRateSnapshot ??
            settings.defaultCommissionRate;

        const commissionRate = Number(rawRate);

        if (
          !Number.isFinite(commissionRate) ||
          commissionRate < 0 ||
          commissionRate > 100
        ) {
          throw createControllerError(
            409,
            "A valid commission rate is unavailable for this refund."
          );
        }

        const sellerRecoveryAmount = roundMoney(
          amount * (1 - commissionRate / 100)
        );

        const commissionReversalAmount = roundMoney(
          amount - sellerRecoveryAmount
        );

        const [createdRefund] = await Refund.create(
          [
            {
              disputeId: dispute._id,
              orderId: dispute.orderId,
              customerId: dispute.customerId,
              sellerId: dispute.sellerId,
              currency: "BDT",
              requestedAmount: dispute.requestedRefundAmount,
              approvedAmount: amount,
              sellerRecoveryAmount,
              commissionReversalAmount,
              refundDestination: dispute.refundDestination,
              status: "approved",
            },
          ],
          { session }
        );

        refund = createdRefund;

        if (
          payout &&
          amount > Number(payout.grossAmount || 0) + 0.01
        ) {
          throw createControllerError(
            409,
            "The approved refund exceeds the remaining merchandise amount recorded for this order."
          );
        }

        if (
          payout &&
          ["on_hold", "available"].includes(payout.status)
        ) {
          const currentGross = Number(payout.grossAmount || 0);
          const currentCommission = Number(
            payout.commissionAmount || 0
          );

          const currentSellerEarnings = Number(
            payout.sellerEarningsAmount ||
              (
                Number(payout.netAmount || 0) +
                Number(payout.recoveryDeduction || 0)
              )
          );

          if (amount > currentGross + 0.01) {
            throw createControllerError(
              409,
              "The approved refund exceeds the remaining unpaid payout merchandise balance."
            );
          }

          // Deduct what is still unpaid now. If earlier seller recoveries
          // have already consumed part of this payout, carry the shortfall
          // forward as a SellerRecovery instead of losing the liability.
          const availableSellerPayable = Math.max(
            0,
            Number(payout.netAmount || 0)
          );

          const deductionFromThisPayout = roundMoney(
            Math.min(
              availableSellerPayable,
              sellerRecoveryAmount
            )
          );

          const deferredRecoveryAmount = roundMoney(
            Math.max(
              0,
              sellerRecoveryAmount - deductionFromThisPayout
            )
          );

          payout.grossAmount = roundMoney(
            Math.max(0, currentGross - amount)
          );

          payout.commissionAmount = roundMoney(
            Math.max(
              0,
              currentCommission - commissionReversalAmount
            )
          );

          payout.sellerEarningsAmount = roundMoney(
            Math.max(
              0,
              currentSellerEarnings - sellerRecoveryAmount
            )
          );

          payout.netAmount = roundMoney(
            Math.max(
              0,
              availableSellerPayable - deductionFromThisPayout
            )
          );

          payout.refundDeduction = roundMoney(
            Number(payout.refundDeduction || 0) +
              deductionFromThisPayout
          );

          payout.refundedGrossAmount = roundMoney(
            Number(payout.refundedGrossAmount || 0) + amount
          );

          payout.disputeHold = false;

          if (
            payout.grossAmount <= 0.001 ||
            payout.netAmount <= 0.001
          ) {
            payout.status = "cancelled";
            payout.netAmount = 0;
          } else {
            payout.status =
              payout.eligibleAt.getTime() <= now.getTime()
                ? "available"
                : "on_hold";
          }

          await payout.save({ session });

          if (deferredRecoveryAmount > 0.001) {
            const [recovery] = await SellerRecovery.create(
              [
                {
                  refundId: createdRefund._id,
                  sellerId: dispute.sellerId,
                  orderId: dispute.orderId,
                  originalAmount: deferredRecoveryAmount,
                  remainingAmount: deferredRecoveryAmount,
                  recoveredAmount: 0,
                  status: "pending",
                },
              ],
              { session }
            );

            await writeAuditLog({
              actorRole: "system",
              action: "SELLER_RECOVERY_CREATED",
              targetType: "SellerRecovery",
              targetId: recovery._id,
              changes: {
                before: null,
                after: {
                  refundId: createdRefund._id.toString(),
                  sellerId: dispute.sellerId.toString(),
                  originalAmount: recovery.originalAmount,
                  remainingAmount: recovery.remainingAmount,
                  status: recovery.status,
                },
              },
              session,
            });
          }
        } else if (sellerRecoveryAmount > 0) {
          // The original payout has already been sent (or is unavailable).
          // Recover the seller's share from future seller payouts.
          const [recovery] = await SellerRecovery.create(
            [
              {
                refundId: createdRefund._id,
                sellerId: dispute.sellerId,
                orderId: dispute.orderId,
                originalAmount: sellerRecoveryAmount,
                remainingAmount: sellerRecoveryAmount,
                recoveredAmount: 0,
                status: "pending",
              },
            ],
            { session }
          );

          await writeAuditLog({
            actorRole: "system",
            action: "SELLER_RECOVERY_CREATED",
            targetType: "SellerRecovery",
            targetId: recovery._id,
            changes: {
              before: null,
              after: {
                refundId: createdRefund._id.toString(),
                sellerId: dispute.sellerId.toString(),
                originalAmount: recovery.originalAmount,
                remainingAmount: recovery.remainingAmount,
                status: recovery.status,
              },
            },
            session,
          });
        }
      }

      // Release the payout hold for non-refund decisions and for
      // refund decisions after the financial adjustment is committed.
      if (decision !== "refund") {
        await releaseDisputePayoutHold(
          dispute.orderId,
          session
        );
      }

      dispute.status =
        decision === "rejected" ? "rejected" : "resolved";

      dispute.resolution = {
        decision,
        note,
        approvedRefundAmount:
          decision === "refund" ? refund.approvedAmount : 0,
        resolvedBy: req.user._id,
        resolvedAt: now,
      };

      if (refund) {
        dispute.refundId = refund._id;
      }

      await dispute.save({ session });

      await writeAuditLog({
        adminId: req.user._id,
        action:
          decision === "rejected"
            ? "DISPUTE_REJECTED"
            : "DISPUTE_RESOLVED",
        targetType: "Dispute",
        targetId: dispute._id,
        changes: {
          before,
          after: {
            status: dispute.status,
            decision,
            refundId: dispute.refundId
              ? dispute.refundId.toString()
              : null,
            approvedRefundAmount:
              decision === "refund"
                ? refund.approvedAmount
                : 0,
          },
        },
        note,
        session,
      });

      if (refund) {
        await writeAuditLog({
          adminId: req.user._id,
          action: "REFUND_APPROVED",
          targetType: "Refund",
          targetId: refund._id,
          changes: {
            before: null,
            after: {
              disputeId: dispute._id.toString(),
              orderId: dispute.orderId.toString(),
              approvedAmount: refund.approvedAmount,
              sellerRecoveryAmount: refund.sellerRecoveryAmount,
              commissionReversalAmount:
                refund.commissionReversalAmount,
              status: refund.status,
            },
          },
          note,
          session,
        });
      }

      resultIds = {
        disputeId: dispute._id,
        refundId: refund?._id || null,
      };
    });

    const dispute = await populateDispute(
      Dispute.findById(resultIds.disputeId)
    );

    const refund = resultIds.refundId
      ? await Refund.findById(resultIds.refundId)
      : null;

    return res.status(200).json({
      message:
        decision === "refund"
          ? "Dispute resolved and refund approved. Complete the manual BDT transfer to finish the refund."
          : decision === "replacement"
            ? "Dispute resolved with a replacement decision."
            : "Dispute rejected.",
      dispute,
      refund,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to resolve the dispute."
    );
  } finally {
    if (session) await session.endSession();
  }
};

module.exports = {
  createCustomerDispute,
  getCustomerDisputes,
  getCustomerDisputeById,
  updateCustomerRefundDestination,
  addDisputeMessage,
  getSellerDisputes,
  getSellerDisputeById,
  getAdminDisputes,
  getAdminDisputeById,
  updateAdminDisputeStatus,
  resolveAdminDispute,
};