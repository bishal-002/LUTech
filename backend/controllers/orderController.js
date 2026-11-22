const mongoose = require("mongoose");

const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");

const {
  createPayoutForDeliveredOrder,
} = require("../services/payoutService");

// Keep the existing controller export compatible.
const {
  createCustomerOrder,
} = require("./checkoutController");

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

const changeOrderStatus = async (order, status) => {
  const transitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
  };

  // --------------------------------------------------
  // CANCELLATION: RESTORE INVENTORY TRANSACTIONALLY
  // --------------------------------------------------

  if (status === "cancelled") {
    const session = await mongoose.startSession();

    let transitionAllowed = false;
    let cancelledOrder = null;

    try {
      await session.withTransaction(async () => {
        transitionAllowed = false;
        cancelledOrder = null;

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

            throw new Error(
              `Unable to restore inventory for ${itemName}. The order was not cancelled.`
            );
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

      order.status = cancelledOrder.status;
      order.paymentStatus = cancelledOrder.paymentStatus;
      order.updatedAt = cancelledOrder.updatedAt;

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

      // Load hidden financial snapshots explicitly.
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

      // Update order lifecycle.
      currentOrder.status = status;

      if (status === "delivered") {
        currentOrder.deliveredAt = new Date();

        if (currentOrder.paymentMethod === "COD") {
          currentOrder.paymentStatus = "paid";
        }
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
      // UPDATE CUSTOMER AND SELLER METRICS
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
          throw new Error(
            "Customer account not found. Customer metrics could not be updated."
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
          throw new Error(
            "Seller account not found. Seller metrics could not be updated."
          );
        }
      }

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
      "cancelled",
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status.",
      });
    }

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
      status
    );

    if (!updated) {
      return res.status(400).json({
        message:
          `Cannot change order from ${order.status} to ${status}.`,
      });
    }

    return res.status(200).json({
      message: "Order status updated.",
      order,
    });
  } catch (error) {
    console.error("Update seller order:", error);

    return res.status(500).json({
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
      "cancelled",
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status.",
      });
    }

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
      status
    );

    if (!updated) {
      return res.status(400).json({
        message:
          `Cannot change order from ${order.status} to ${status}.`,
      });
    }

    return res.status(200).json({
      message: "Order status updated.",
      order,
    });
  } catch (error) {
    console.error("Update admin order:", error);

    return res.status(500).json({
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