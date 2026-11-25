
const mongoose = require("mongoose");

const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");

const {
  createPayoutForDeliveredOrder,
} = require("../services/payoutService");

const {
  notifyRestockEvents,
} = require("../services/productNotificationService");

// Keep the existing controller export compatible.
const {
  createCustomerOrder,
} = require("./checkoutController");

// ======================================================
// ORDER STATUS ERRORS
// ======================================================

const createOrderStatusError = (
  message,
  statusCode = 400
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// ======================================================
// REFUSAL NOTE VALIDATION
// ======================================================

const normalizeRefusalNote = (status, value) => {
  if (status !== "refused") {
    return "";
  }

  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value !== "string") {
    throw createOrderStatusError(
      "Refusal note must be text."
    );
  }

  const note = value.trim();

  if (note.length > 500) {
    throw createOrderStatusError(
      "Refusal note cannot exceed 500 characters."
    );
  }

  return note;
};

// ======================================================
// GET SELLER ORDERS
// ======================================================

const getSellerOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      sellerId: req.user._id,
    })
      .populate("customerId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get seller orders:", error);

    return res.status(500).json({
      message: "Unable to retrieve orders.",
    });
  }
};

// ======================================================
// GET SINGLE SELLER ORDER
// ======================================================

const getSellerOrderById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      sellerId: req.user._id,
    }).populate("customerId", "name email");

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      order,
    });
  } catch (error) {
    console.error("Get seller order:", error);

    return res.status(500).json({
      message: "Unable to retrieve order.",
    });
  }
};

// ======================================================
// CHANGE ORDER STATUS
// ======================================================

const changeOrderStatus = async (
  order,
  status,
  actor = null,
  refusalNote = ""
) => {
  const transitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered", "refused"],
    delivered: [],
    refused: [],
    cancelled: [],
  };

  // --------------------------------------------------
  // CANCELLATION: RESTORE INVENTORY TRANSACTIONALLY
  // --------------------------------------------------

  if (status === "cancelled") {
    const session = await mongoose.startSession();

    let transitionAllowed = false;
    let cancelledOrder = null;
    let restockEvents = [];

    try {
      await session.withTransaction(async () => {
        transitionAllowed = false;
        cancelledOrder = null;
        restockEvents = [];

        const currentOrder = await Order.findById(
          order._id
        ).session(session);

        if (
          !currentOrder ||
          !transitions[currentOrder.status]?.includes(status)
        ) {
          return;
        }

        for (const item of currentOrder.items) {
          // Read the current product and variant before
          // restoring the cancelled order quantity.
          const productBeforeRestock = await Product.findOne({
            _id: item.productId,
            "variants._id": item.variantId,
          })
            .select("title variants")
            .session(session);

          const variantBeforeRestock =
            productBeforeRestock?.variants.id(
              item.variantId
            );

          if (!variantBeforeRestock) {
            const itemName =
              item.snapshot?.title ||
              item.name ||
              "an order item";

            throw createOrderStatusError(
              `Unable to restore inventory for ${itemName}. The order was not cancelled.`,
              409
            );
          }

          const previousStock = Number(
            variantBeforeRestock.stockQuantity || 0
          );

          const restoredStock =
            previousStock + Number(item.quantity);

          const stockUpdate = await Product.updateOne(
            {
              _id: item.productId,
              variants: {
                $elemMatch: {
                  _id: item.variantId,
                },
              },
            },
            {
              $inc: {
                "variants.$.stockQuantity": item.quantity,
              },
            },
            { session }
          );

          if (stockUpdate.modifiedCount !== 1) {
            const itemName =
              item.snapshot?.title ||
              item.name ||
              "an order item";

            throw createOrderStatusError(
              `Unable to restore inventory for ${itemName}. The order was not cancelled.`,
              409
            );
          }

          // Queue a notification event only when the
          // variant transitions from unavailable to available.
          if (
            previousStock <= 0 &&
            restoredStock > 0
          ) {
            restockEvents.push({
              productId: String(item.productId),
              productTitle:
                productBeforeRestock.title ||
                item.snapshot?.title ||
                item.name ||
                "Product",
              variantSku:
                variantBeforeRestock.sku,
              availableQuantity: restoredStock,
            });
          }
        }

        currentOrder.status = "cancelled";

        await currentOrder.save({ session });

        cancelledOrder = currentOrder;
        transitionAllowed = true;
      });

      if (!transitionAllowed || !cancelledOrder) {
        return false;
      }

      // The inventory transaction has committed successfully.
      order.status = cancelledOrder.status;
      order.paymentStatus = cancelledOrder.paymentStatus;
      order.updatedAt = cancelledOrder.updatedAt;

      // Send restock emails only after transaction commit.
      // Email failures must not roll back order cancellation
      // or restored inventory.
      await notifyRestockEvents(restockEvents);

      return true;
    } finally {
      await session.endSession();
    }
  }

  // --------------------------------------------------
  // OTHER STATUS TRANSITIONS
  // --------------------------------------------------

  const session = await mongoose.startSession();

  let transitionAllowed = false;
  let updatedOrder = null;

  try {
    await session.withTransaction(async () => {
      transitionAllowed = false;
      updatedOrder = null;

      // Always load the latest order state inside
      // the transaction to prevent duplicate updates.
      const currentOrder = await Order.findById(
        order._id
      )
        .select(
          [
            "+commissionRateSnapshot",
            "+payoutHoldDaysSnapshot",
            "+commissionBaseAmount",
            "+platformCommissionAmount",
            "+sellerNetAmount",
          ].join(" ")
        )
        .session(session);

      if (
        !currentOrder ||
        !transitions[currentOrder.status]?.includes(status)
      ) {
        return;
      }

      // ------------------------------------------------
      // REFUSED COD VALIDATION
      // ------------------------------------------------

      if (status === "refused") {
        if (currentOrder.paymentMethod !== "COD") {
          throw createOrderStatusError(
            "Only Cash on Delivery orders can be marked as refused."
          );
        }

        if (currentOrder.paymentStatus !== "pending") {
          throw createOrderStatusError(
            "Only unpaid COD orders can be marked as refused."
          );
        }

        if (!currentOrder.customerId) {
          throw createOrderStatusError(
            "The order has no associated customer.",
            409
          );
        }
      }

      // ------------------------------------------------
      // UPDATE ORDER LIFECYCLE
      // ------------------------------------------------

      currentOrder.status = status;

      if (status === "delivered") {
        currentOrder.deliveredAt = new Date();

        if (currentOrder.paymentMethod === "COD") {
          currentOrder.paymentStatus = "paid";
        }
      }

      if (status === "refused") {
        currentOrder.refusedAt = new Date();

        currentOrder.refusalRecordedBy =
          actor?._id || null;

        currentOrder.refusalNote = refusalNote;

        // IMPORTANT:
        // Do not restore inventory here. The parcel may
        // still be with the delivery/courier service.
        // Inventory should only be restored after the
        // returned parcel is physically received and
        // inspected through a separate return process.
      }

      await currentOrder.save({ session });

      // ------------------------------------------------
      // CREATE SELLER PAYOUT WHEN COD ORDER IS DELIVERED
      // ------------------------------------------------

      if (
        status === "delivered" &&
        currentOrder.paymentMethod === "COD" &&
        currentOrder.paymentStatus === "paid"
      ) {
        await createPayoutForDeliveredOrder({
          order: currentOrder,
          session,
        });
      }

      // ------------------------------------------------
      // UPDATE CUSTOMER AND SELLER METRICS: DELIVERED
      // ------------------------------------------------

      if (status === "delivered") {
        const customerUpdate = await User.updateOne(
          {
            _id: currentOrder.customerId,
          },
          {
            $inc: {
              "customerMetrics.deliveredOrders": 1,
              "customerMetrics.totalSpent":
                currentOrder.totalAmount,
            },
          },
          { session }
        );

        if (customerUpdate.matchedCount !== 1) {
          throw createOrderStatusError(
            "Customer account not found. Customer metrics could not be updated.",
            409
          );
        }

        const sellerUpdate = await User.updateOne(
          {
            _id: currentOrder.sellerId,
            role: "seller",
          },
          {
            $inc: {
              "metrics.completedOrders": 1,
            },
          },
          { session }
        );

        if (sellerUpdate.matchedCount !== 1) {
          throw createOrderStatusError(
            "Seller account not found. Seller metrics could not be updated.",
            409
          );
        }
      }

      // ------------------------------------------------
      // UPDATE CUSTOMER METRIC: REFUSED COD
      // ------------------------------------------------

      if (status === "refused") {
        const refusalMetricUpdate = await User.updateOne(
          {
            _id: currentOrder.customerId,
            role: "customer",
          },
          {
            $inc: {
              "customerMetrics.refusedCodOrders": 1,
            },
          },
          { session }
        );

        if (refusalMetricUpdate.matchedCount !== 1) {
          throw createOrderStatusError(
            "Customer account not found. Refused COD metric could not be updated.",
            409
          );
        }
      }

      // The order status and the customer metric are
      // committed together by this transaction.
      transitionAllowed = true;
      updatedOrder = currentOrder;
    });

    if (!transitionAllowed || !updatedOrder) {
      return false;
    }

    // Synchronize the original order for the response.
    order.status = updatedOrder.status;
    order.paymentStatus = updatedOrder.paymentStatus;
    order.deliveredAt = updatedOrder.deliveredAt;
    order.refusedAt = updatedOrder.refusedAt;
    order.refusalRecordedBy =
      updatedOrder.refusalRecordedBy;
    order.refusalNote = updatedOrder.refusalNote;
    order.updatedAt = updatedOrder.updatedAt;

    return true;
  } finally {
    await session.endSession();
  }
};

// ======================================================
// UPDATE SELLER ORDER STATUS
// ======================================================

const updateSellerOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    const allowed = [
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "refused",
      "cancelled",
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status.",
      });
    }

    const refusalNote = normalizeRefusalNote(
      status,
      req.body.refusalNote
    );

    const order = await Order.findOne({
      _id: req.params.id,
      sellerId: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    const updated = await changeOrderStatus(
      order,
      status,
      req.user,
      refusalNote
    );

    if (!updated) {
      return res.status(400).json({
        message:
          `Cannot change order from ${order.status} to ${status}.`,
      });
    }

    return res.status(200).json({
      message:
        status === "refused"
          ? "COD order marked as refused. Customer metric updated."
          : "Order status updated.",
      order,
    });
  } catch (error) {
    console.error("Update seller order:", error);

    return res.status(error.statusCode || 500).json({
      message:
        error.message || "Unable to update order.",
    });
  }
};

// ======================================================
// GET CUSTOMER ORDERS
// ======================================================

const getCustomerOrders = async (req, res) => {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({
        message: "Customer access only.",
      });
    }

    const orders = await Order.find({
      customerId: req.user._id,
    })
      .populate(
        "sellerId",
        "name email storeName storeSlug"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get customer orders:", error);

    return res.status(500).json({
      message: "Unable to retrieve orders.",
    });
  }
};

// ======================================================
// GET SINGLE CUSTOMER ORDER
// ======================================================

const getCustomerOrderById = async (req, res) => {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({
        message: "Customer access only.",
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      customerId: req.user._id,
    }).populate(
      "sellerId",
      "name email storeName storeSlug"
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      order,
    });
  } catch (error) {
    console.error("Get customer order:", error);

    return res.status(500).json({
      message: "Unable to retrieve order.",
    });
  }
};

// ======================================================
// GET ALL ADMIN ORDERS
// ======================================================

const getAllOrders = async (req, res) => {
  try {
    const filter = {};

    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    const orders = await Order.find(filter)
      .populate("customerId", "name email")
      .populate(
        "sellerId",
        "name email storeName storeSlug"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get all orders:", error);

    return res.status(500).json({
      message: "Unable to retrieve orders.",
    });
  }
};

// ======================================================
// GET SINGLE ADMIN ORDER
// ======================================================

const getAdminOrderById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    const order = await Order.findById(
      req.params.id
    )
      .populate("customerId", "name email")
      .populate(
        "sellerId",
        "name email storeName storeSlug"
      );

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      order,
    });
  } catch (error) {
    console.error("Get admin order:", error);

    return res.status(500).json({
      message: "Unable to retrieve order.",
    });
  }
};

// ======================================================
// UPDATE ADMIN ORDER STATUS
// ======================================================

const updateAdminOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    const allowed = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "refused",
      "cancelled",
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status.",
      });
    }

    const refusalNote = normalizeRefusalNote(
      status,
      req.body.refusalNote
    );

    const order = await Order.findById(
      req.params.id
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    const updated = await changeOrderStatus(
      order,
      status,
      req.user,
      refusalNote
    );

    if (!updated) {
      return res.status(400).json({
        message:
          `Cannot change order from ${order.status} to ${status}.`,
      });
    }

    return res.status(200).json({
      message:
        status === "refused"
          ? "COD order marked as refused. Customer metric updated."
          : "Order status updated.",
      order,
    });
  } catch (error) {
    console.error("Update admin order:", error);

    return res.status(error.statusCode || 500).json({
      message:
        error.message || "Unable to update order.",
    });
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  getSellerOrders,
  getSellerOrderById,
  updateSellerOrderStatus,

  createCustomerOrder,

  getAllOrders,
  getAdminOrderById,
  updateAdminOrderStatus,

  getCustomerOrders,
  getCustomerOrderById,
};
