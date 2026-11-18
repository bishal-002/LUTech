
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const Cart = require("../models/Cart");

const getSellerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ sellerId: req.user._id })
      .populate("customerId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: orders.length, orders });
  } catch (error) {
    console.error("Get seller orders:", error);
    return res.status(500).json({ message: "Unable to retrieve orders." });
  }
};

const getSellerOrderById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID." });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      sellerId: req.user._id,
    }).populate("customerId", "name email");

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    return res.status(200).json({ order });
  } catch (error) {
    console.error("Get seller order:", error);
    return res.status(500).json({ message: "Unable to retrieve order." });
  }
};

const changeOrderStatus = async (order, status) => {
  const transitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
  };

  if (!transitions[order.status]?.includes(status)) {
    return false;
  }

  order.status = status;

  if (status === "delivered" && order.paymentMethod === "COD") {
    order.paymentStatus = "paid";
  }

  await order.save();

  // Update customer metrics when an order is delivered.
  if (status === "delivered") {
    try {
      await User.updateOne(
        { _id: order.customerId },
        {
          $inc: {
            "customerMetrics.deliveredOrders": 1,
            "customerMetrics.totalSpent": order.totalAmount,
          },
        }
      );
    } catch (error) {
      console.error("Customer metrics update failed:", error);
    }
  }

  return true;
};

const updateSellerOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID." });
    }

    const allowed = ["confirmed", "processing", "shipped", "delivered", "cancelled"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid order status." });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      sellerId: req.user._id,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const updated = await changeOrderStatus(order, status);

    if (!updated) {
      return res.status(400).json({
        message: `Cannot change order from ${order.status} to ${status}.`,
      });
    }

    return res.status(200).json({
      message: "Order status updated.",
      order,
    });
  } catch (error) {
    console.error("Update seller order:", error);
    return res.status(500).json({ message: "Unable to update order." });
  }
};

const createCustomerOrder = async (req, res) => {
  if (req.user.role !== "customer") {
    return res.status(403).json({
      message: "Only customer accounts can place orders.",
    });
  }

  // Use the saved default address and customer contact details as fallbacks.
  const customerProfile = await User.findById(req.user._id)
    .select("name phone address addresses");

  if (!customerProfile) {
    return res.status(404).json({ message: "Customer account not found." });
  }

  const savedShippingAddress =
    customerProfile.addresses?.find((item) => item.isDefaultShipping) ||
    customerProfile.addresses?.[0];

  const shippingName = String(
    req.body.shippingName || savedShippingAddress?.recipientName || customerProfile.name || ""
  ).trim();

  const shippingPhone = String(
    req.body.shippingPhone || savedShippingAddress?.recipientPhone || customerProfile.phone || ""
  ).trim();

  const savedAddressText = savedShippingAddress
    ? [
      savedShippingAddress.streetAddress,
      savedShippingAddress.area,
      savedShippingAddress.district,
      savedShippingAddress.division,
      savedShippingAddress.postalCode,
    ].filter(Boolean).join(", ")
    : "";

  const shippingAddress = String(
    req.body.shippingAddress || savedAddressText || customerProfile.address || ""
  ).trim();

  if (!shippingName || !shippingPhone || !shippingAddress) {
    return res.status(400).json({
      message: "Add a mobile number and delivery address to your account, or provide them at checkout.",
    });
  }

  const session = await mongoose.startSession();

  try {
    let createdOrders = [];

    await session.withTransaction(async () => {
      const cartItems = await Cart.find({ userId: req.user._id }).session(session);

      if (!cartItems.length) {
        throw new Error("Your cart is empty.");
      }

      const sellerGroups = new Map();

      for (const cartItem of cartItems) {
        const product = await Product.findById(cartItem.productId).session(session);

        if (!product) {
          throw new Error("A product in your cart is no longer available.");
        }

        const variant = product.variants.id(cartItem.variantId);

        if (!variant) {
          throw new Error(`${product.title} has an unavailable variant.`);
        }

        const maxQuantity = variant.maxOrderQuantity || 99;

        if (
          cartItem.quantity > variant.stockQuantity ||
          cartItem.quantity > maxQuantity
        ) {
          throw new Error(`Insufficient stock for ${product.title}.`);
        }

        const sellerId = product.sellerId || product.seller;

        if (!sellerId) {
          throw new Error(`${product.title} has no assigned seller.`);
        }

        const seller = await User.findOne({
          _id: sellerId,
          role: "seller",
          sellerStatus: "approved",
          verificationStatus: "approved",
          isVerified: true,
        }).session(session);

        if (!seller) {
          throw new Error(`The seller for ${product.title} is unavailable.`);
        }

        const stockUpdate = await Product.updateOne(
          {
            _id: product._id,
            variants: {
              $elemMatch: {
                _id: variant._id,
                stockQuantity: { $gte: cartItem.quantity },
              },
            },
          },
          {
            $inc: {
              "variants.$.stockQuantity": -cartItem.quantity,
            },
          },
          { session }
        );

        if (stockUpdate.modifiedCount !== 1) {
          throw new Error(`Stock changed for ${product.title}. Please retry.`);
        }

        const unitPrice = variant.salePrice ?? variant.regularPrice;
        const mainImage = product.images?.find((image) => image.slot === "main");

        const orderItem = {
          productId: product._id,
          variantId: variant._id,
          snapshot: {
            title: product.title,
            sku: variant.sku,
            attributes: variant.attributes || {},
            image: mainImage?.url || product.image || "",
            brand: product.brandId?.name || "",
            condition: product.condition,
          },
          name: product.title,
          price: unitPrice,
          unitPrice,
          image: mainImage?.url || product.image || "",
          quantity: cartItem.quantity,
          subtotal: unitPrice * cartItem.quantity,
        };

        const key = seller._id.toString();

        if (!sellerGroups.has(key)) {
          sellerGroups.set(key, {
            sellerId: seller._id,
            items: [],
          });
        }

        sellerGroups.get(key).items.push(orderItem);
      }

      const orderDocuments = [];

      for (const group of sellerGroups.values()) {
        orderDocuments.push({
          customerId: req.user._id,
          sellerId: group.sellerId,
          items: group.items,
          shippingName: shippingName.trim(),
          shippingPhone: shippingPhone.trim(),
          shippingAddress: shippingAddress.trim(),
          paymentMethod: "COD",
          paymentStatus: "pending",
          status: "pending",
        });
      }

      createdOrders = await Order.create(orderDocuments, { session });

      await Cart.deleteMany({ userId: req.user._id }).session(session);
    });

    return res.status(201).json({
      message: "Your order has been placed successfully.",
      paymentMethod: "COD",
      count: createdOrders.length,
      orders: createdOrders,
    });
  } catch (error) {
    console.error("Customer checkout error:", error);

    return res.status(400).json({
      message: error.message || "Unable to place your order.",
    });
  } finally {
    await session.endSession();
  }
};

const getCustomerOrders = async (req, res) => {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({ message: "Customer access only." });
    }

    const orders = await Order.find({ customerId: req.user._id })
      .populate("sellerId", "name email storeName storeSlug")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: orders.length, orders });
  } catch (error) {
    console.error("Get customer orders:", error);
    return res.status(500).json({ message: "Unable to retrieve orders." });
  }
};

const getCustomerOrderById = async (req, res) => {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({ message: "Customer access only." });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID." });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      customerId: req.user._id,
    }).populate("sellerId", "name email storeName storeSlug");

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    return res.status(200).json({ order });
  } catch (error) {
    console.error("Get customer order:", error);
    return res.status(500).json({ message: "Unable to retrieve order." });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const filter = {};

    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    const orders = await Order.find(filter)
      .populate("customerId", "name email")
      .populate("sellerId", "name email storeName storeSlug")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: orders.length, orders });
  } catch (error) {
    console.error("Get all orders:", error);
    return res.status(500).json({ message: "Unable to retrieve orders." });
  }
};

const getAdminOrderById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID." });
    }

    const order = await Order.findById(req.params.id)
      .populate("customerId", "name email")
      .populate("sellerId", "name email storeName storeSlug");

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    return res.status(200).json({ order });
  } catch (error) {
    console.error("Get admin order:", error);
    return res.status(500).json({ message: "Unable to retrieve order." });
  }
};

const updateAdminOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID." });
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
      return res.status(400).json({ message: "Invalid order status." });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const updated = await changeOrderStatus(order, status);

    if (!updated) {
      return res.status(400).json({
        message: `Cannot change order from ${order.status} to ${status}.`,
      });
    }

    return res.status(200).json({
      message: "Order status updated.",
      order,
    });
  } catch (error) {
    console.error("Update admin order:", error);
    return res.status(500).json({ message: "Unable to update order." });
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
  getCustomerOrders,
  getCustomerOrderById,
};
