const mongoose = require("mongoose");

const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const Cart = require("../models/Cart");

const {
  getPlatformSettings,
} = require("../services/platformSettingsService");

// ======================================================
// CREATE CUSTOMER ORDER
// POST /api/orders/checkout
// ======================================================

const createCustomerOrder = async (req, res) => {
  if (req.user.role !== "customer") {
    return res.status(403).json({
      message:
        "Only customer accounts can place orders.",
    });
  }

  // Use the saved default address and customer contact details.
  const customerProfile = await User.findById(
    req.user._id
  ).select("name phone address addresses");

  if (!customerProfile) {
    return res.status(404).json({
      message: "Customer account not found.",
    });
  }

  const savedShippingAddress =
    customerProfile.addresses?.find(
      (item) => item.isDefaultShipping
    ) ||
    customerProfile.addresses?.[0];

  const shippingName = String(
    req.body.shippingName ||
      savedShippingAddress?.recipientName ||
      customerProfile.name ||
      ""
  ).trim();

  const shippingPhone = String(
    req.body.shippingPhone ||
      savedShippingAddress?.recipientPhone ||
      customerProfile.phone ||
      ""
  ).trim();

  const savedAddressText = savedShippingAddress
    ? [
        savedShippingAddress.streetAddress,
        savedShippingAddress.area,
        savedShippingAddress.district,
        savedShippingAddress.division,
        savedShippingAddress.postalCode,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  const shippingAddress = String(
    req.body.shippingAddress ||
      savedAddressText ||
      customerProfile.address ||
      ""
  ).trim();

  if (
    !shippingName ||
    !shippingPhone ||
    !shippingAddress
  ) {
    return res.status(400).json({
      message:
        "Add a mobile number and delivery address to your account, or provide them at checkout.",
    });
  }

  const session = await mongoose.startSession();

  try {
    let createdOrders = [];

    await session.withTransaction(async () => {
      // ----------------------------------------------
      // LOAD PLATFORM SETTINGS
      // ----------------------------------------------

      const settings = await getPlatformSettings({
        session,
      });

      // ----------------------------------------------
      // CHECK CUSTOMER COD REFUSAL LIMIT
      // ----------------------------------------------

      const customer = await User.findById(
        req.user._id
      )
        .select("customerMetrics.refusedCodOrders")
        .session(session);

      if (!customer) {
        throw new Error(
          "Customer account not found."
        );
      }

      const refusedCodOrders = Number(
        customer.customerMetrics?.refusedCodOrders || 0
      );

      const maxRefusedCodAllowed = Number(
        settings.maxRefusedCodAllowed
      );

      if (
        !Number.isInteger(maxRefusedCodAllowed) ||
        maxRefusedCodAllowed < 1
      ) {
        throw new Error(
          "The platform COD refusal limit is not configured correctly."
        );
      }

      if (
        refusedCodOrders >= maxRefusedCodAllowed
      ) {
        throw new Error(
          "Cash on Delivery is unavailable because your refused COD order limit has been reached."
        );
      }

      // ----------------------------------------------
      // LOAD CART
      // ----------------------------------------------

      const cartItems = await Cart.find({
        userId: req.user._id,
      }).session(session);

      if (!cartItems.length) {
        throw new Error("Your cart is empty.");
      }

      const sellerGroups = new Map();

      // The COD limit applies to the complete cart,
      // including products from multiple sellers.
      let cartTotalAmount = 0;

      // ----------------------------------------------
      // VALIDATE CART AND RESERVE STOCK
      // ----------------------------------------------

      for (const cartItem of cartItems) {
        const product = await Product.findById(
          cartItem.productId
        )
          .populate("brandId", "name")
          .session(session);

        if (!product) {
          throw new Error(
            "A product in your cart is no longer available."
          );
        }

        const variant = product.variants.id(
          cartItem.variantId
        );

        if (!variant) {
          throw new Error(
            `${product.title} has an unavailable variant.`
          );
        }

        const maxQuantity =
          variant.maxOrderQuantity || 99;

        if (
          cartItem.quantity > variant.stockQuantity ||
          cartItem.quantity > maxQuantity
        ) {
          throw new Error(
            `Insufficient stock for ${product.title}.`
          );
        }

        const sellerId =
          product.sellerId || product.seller;

        if (!sellerId) {
          throw new Error(
            `${product.title} has no assigned seller.`
          );
        }

        const seller = await User.findOne({
          _id: sellerId,
          role: "seller",
          status: "active",
          sellerStatus: "approved",
          verificationStatus: "approved",
          isVerified: true,
        }).session(session);

        if (!seller) {
          throw new Error(
            `The seller for ${product.title} is unavailable.`
          );
        }

        const unitPrice =
          variant.salePrice ?? variant.regularPrice;

        if (
          typeof unitPrice !== "number" ||
          !Number.isFinite(unitPrice) ||
          unitPrice < 0
        ) {
          throw new Error(
            `Invalid product price for ${product.title}.`
          );
        }

        const itemSubtotal =
          unitPrice * cartItem.quantity;

        cartTotalAmount += itemSubtotal;

        // Reserve stock inside the transaction.
        const stockUpdate = await Product.updateOne(
          {
            _id: product._id,
            variants: {
              $elemMatch: {
                _id: variant._id,
                stockQuantity: {
                  $gte: cartItem.quantity,
                },
              },
            },
          },
          {
            $inc: {
              "variants.$.stockQuantity":
                -cartItem.quantity,
            },
          },
          { session }
        );

        if (stockUpdate.modifiedCount !== 1) {
          throw new Error(
            `Stock changed for ${product.title}. Please retry.`
          );
        }

        const mainImage = product.images?.find(
          (image) => image.slot === "main"
        );

        const orderItem = {
          productId: product._id,
          variantId: variant._id,

          snapshot: {
            title: product.title,
            sku: variant.sku,
            attributes: variant.attributes || {},
            image:
              mainImage?.url ||
              product.image ||
              "",
            brand: product.brandId?.name || "",
            condition: product.condition,
          },

          name: product.title,
          price: unitPrice,
          unitPrice,
          image:
            mainImage?.url ||
            product.image ||
            "",
          quantity: cartItem.quantity,
          subtotal: itemSubtotal,
        };

        const sellerKey = seller._id.toString();

        if (!sellerGroups.has(sellerKey)) {
          sellerGroups.set(sellerKey, {
            sellerId: seller._id,
            items: [],
          });
        }

        sellerGroups.get(sellerKey).items.push(
          orderItem
        );
      }

      // ----------------------------------------------
      // ENFORCE COD MAXIMUM
      // ----------------------------------------------

      const codMaxOrderAmount = Number(
        settings.codMaxOrderAmount
      );

      if (
        !Number.isSafeInteger(codMaxOrderAmount) ||
        codMaxOrderAmount < 1
      ) {
        throw new Error(
          "The platform COD maximum order amount is not configured correctly."
        );
      }

      if (cartTotalAmount > codMaxOrderAmount) {
        throw new Error(
          `Your cart total of BDT ${cartTotalAmount.toFixed(
            2
          )} exceeds the COD maximum of BDT ${codMaxOrderAmount.toFixed(
            2
          )}. Please reduce your cart total to continue with Cash on Delivery.`
        );
      }

      // ----------------------------------------------
      // CREATE SELLER-SPECIFIC ORDERS
      // ----------------------------------------------

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

      createdOrders = await Order.create(
        orderDocuments,
        { session }
      );

      // Clear cart only after orders are created successfully.
      await Cart.deleteMany({
        userId: req.user._id,
      }).session(session);
    });

    return res.status(201).json({
      message: "Your order has been placed successfully.",
      paymentMethod: "COD",
      count: createdOrders.length,
      orders: createdOrders,
    });
  } catch (error) {
    console.error(
      "Customer checkout error:",
      error
    );

    return res.status(400).json({
      message:
        error.message ||
        "Unable to place your order.",
    });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  createCustomerOrder,
};