
const Order = require("../models/Order");

// Get Seller Orders
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
    console.error(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

// Get Single Seller Order
const getSellerOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      sellerId: req.user._id,
    }).populate("customerId", "name email");

    if (!order) {
      return res.status(404).json({
        message: "Order not found or access denied",
      });
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

// Update Seller Order Status
const updateSellerOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status",
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      sellerId: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found or access denied",
      });
    }

    if (order.status === "cancelled" || order.status === "delivered") {
      return res.status(400).json({
        message: "This order can no longer be updated",
      });
    }

    order.status = status;

    await order.save();

    return res.status(200).json({
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

module.exports = {
  getSellerOrders,
  getSellerOrderById,
  updateSellerOrderStatus,
};
