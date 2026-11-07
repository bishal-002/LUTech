
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

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


const createCustomerOrder = async (req, res) => {
  const session = await Order.startSession();

  try {
    // Only customer accounts can place customer orders.
    if (req.user.role !== "customer") {
      return res.status(403).json({
        message: "Only customers can place orders",
      });
    }

    const { items, shippingName, shippingPhone, shippingAddress } = req.body;

    if (
      !Array.isArray(items) ||
      items.length === 0 ||
      !shippingName?.trim() ||
      !shippingPhone?.trim() ||
      !shippingAddress?.trim()
    ) {
      return res.status(400).json({
        message: "Please provide products and complete shipping details",
      });
    }

    // Validate quantities and product IDs.
    for (const item of items) {
      if (
        !item.productId ||
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) < 1 ||
        Number(item.quantity) > 99
      ) {
        return res.status(400).json({
          message: "Invalid product or quantity",
        });
      }
    }

    const productIds = [...new Set(items.map(item => item.productId))];

    // Fetch authoritative product information from MongoDB.
    const products = await Product.find({
      _id: { $in: productIds },
    }).session(session);

    if (products.length !== productIds.length) {
      return res.status(400).json({
        message: "One or more products are unavailable",
      });
    }

    const productMap = new Map(
      products.map(product => [product._id.toString(), product])
    );

    // Find the Admin account for Admin-created products.
    const admin = await User.findOne({
      role: "admin",
      isVerified: true,
    }).session(session);

    // Group products according to their actual owner.
    const sellerGroups = new Map();

    for (const item of items) {
      const product = productMap.get(item.productId.toString());
      const quantity = Number(item.quantity);

      if (!Number.isFinite(Number(product.price)) || Number(product.price) < 0) {
        return res.status(400).json({
          message: "Invalid product price",
        });
      }

      let ownerId;

      if (product.seller) {
        const seller = await User.findOne({
          _id: product.seller,
          role: "seller",
          sellerStatus: "approved",
          isVerified: true,
        }).session(session);

        if (!seller) {
          return res.status(400).json({
            message: `The seller for ${product.name} is unavailable`,
          });
        }

        ownerId = seller._id.toString();
      } else {
        if (!admin) {
          return res.status(500).json({
            message: "Admin account not found for Admin-owned products",
          });
        }

        ownerId = admin._id.toString();
      }

      if (!sellerGroups.has(ownerId)) {
        sellerGroups.set(ownerId, []);
      }

      sellerGroups.get(ownerId).push({
        productId: product._id,
        name: product.name,
        price: Number(product.price),
        image: product.image || "",
        quantity,
      });
    }

    const orderDocuments = [];

    for (const [sellerId, orderItems] of sellerGroups) {
      const totalAmount = orderItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      );

      orderDocuments.push({
        customerId: req.user._id,
        sellerId,
        items: orderItems,
        shippingName: shippingName.trim(),
        shippingPhone: shippingPhone.trim(),
        shippingAddress: shippingAddress.trim(),
        totalAmount,
        paymentMethod: "COD",
        paymentStatus: "pending",
        status: "pending",
      });
    }

    // Create all seller-specific orders in one transaction.
    let createdOrders = [];

    await session.withTransaction(async () => {
      createdOrders = await Order.create(orderDocuments, { session });
    });

    return res.status(201).json({
      message: "Order placed successfully",
      count: createdOrders.length,
      orders: createdOrders,
    });
  } catch (error) {
    console.error("Customer checkout error:", error);

    return res.status(500).json({
      message: "Unable to place your order",
    });
  } finally {
    await session.endSession();
  }
};

// Get all orders (Admin)
const getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate("customerId", "name email")
      .populate("sellerId", "name email storeName role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve orders.",
    });
  }
};


// Get single order details (Admin)
const getAdminOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customerId", "name email")
      .populate("sellerId", "name email storeName role");

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    res.status(200).json({ order });
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve order details.",
    });
  }
};


// Update order status (Admin)
const updateAdminOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status.",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    if (["delivered", "cancelled"].includes(order.status)) {
      return res.status(400).json({
        message: "This order can no longer be updated.",
      });
    }

    order.status = status;
    await order.save();

    res.status(200).json({
      message: "Order status updated successfully.",
      order,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update order status.",
    });
  }
};


module.exports = {
  getSellerOrders,
  getSellerOrderById,
  updateSellerOrderStatus,
  createCustomerOrder,
  getAllOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
};
