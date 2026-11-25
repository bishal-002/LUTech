
const mongoose = require("mongoose");

const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const Cart = require("../models/Cart");

const {
  getPlatformSettings,
} = require("../services/platformSettingsService");

// ======================================================
// MONEY HELPER
// ======================================================

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

// ======================================================
// CREATE CUSTOMER ORDER
// POST /api/orders/checkout
// ======================================================

const createCustomerOrder = async (req, res) => {
  if (req.user.role !== "customer") {
    return res.status(403).json({
      message: "Only customer accounts can place orders.",
    });
  }

  try {
    // --------------------------------------------------
    // LOAD CUSTOMER SHIPPING DETAILS
    // --------------------------------------------------

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

    // --------------------------------------------------
    // START TRANSACTION
    // --------------------------------------------------

    const session = await mongoose.startSession();

    try {
      let createdOrders = [];

      await session.withTransaction(async () => {
        // Reset values if MongoDB retries the transaction.
        createdOrders = [];

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
        // LOAD AND VALIDATE PLATFORM PAYOUT SETTINGS
        // ----------------------------------------------

        const defaultCommissionRate = Number(
          settings.defaultCommissionRate
        );

        const payoutHoldDays = Number(
          settings.payoutHoldDays
        );

        if (
          !Number.isFinite(defaultCommissionRate) ||
          defaultCommissionRate < 0 ||
          defaultCommissionRate > 100
        ) {
          throw new Error(
            "The platform default commission rate is invalid."
          );
        }

        if (
          !Number.isInteger(payoutHoldDays) ||
          payoutHoldDays < 0 ||
          payoutHoldDays > 365
        ) {
          throw new Error(
            "The platform payout hold period is invalid."
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

        // COD maximum applies to the complete cart,
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

          // --------------------------------------------
          // LOAD SELLER AND PRIVATE COMMISSION RATE
          // --------------------------------------------

          const seller = await User.findOne({
            _id: sellerId,
            role: "seller",
            status: "active",
            sellerStatus: "approved",
            verificationStatus: "approved",
            isVerified: true,
          })
            .select("+commissionRate")
            .session(session);

          if (!seller) {
            throw new Error(
              `The seller for ${product.title} is unavailable.`
            );
          }

          // --------------------------------------------
          // SNAPSHOT SELLER COMMISSION
          // --------------------------------------------

          const sellerCommissionRate = Number(
            seller.commissionRate
          );

          // Keep the same fallback logic used by
          // payoutService for legacy orders.
          const effectiveCommissionRate =
            Number.isFinite(sellerCommissionRate) &&
            sellerCommissionRate > 0
              ? sellerCommissionRate
              : defaultCommissionRate;

          if (
            !Number.isFinite(effectiveCommissionRate) ||
            effectiveCommissionRate < 0 ||
            effectiveCommissionRate > 100
          ) {
            throw new Error(
              `Invalid commission rate for seller ${seller.name}.`
            );
          }

          // --------------------------------------------
          // VALIDATE PRODUCT PRICE
          // --------------------------------------------

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

          const itemSubtotal = roundMoney(
            unitPrice * cartItem.quantity
          );

          cartTotalAmount = roundMoney(
            cartTotalAmount + itemSubtotal
          );

          // --------------------------------------------
          // RESERVE STOCK TRANSACTIONALLY
          // --------------------------------------------

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

          // --------------------------------------------
          // CREATE HISTORICAL PRODUCT SNAPSHOT
          // --------------------------------------------

          const mainImage = product.images?.find(
            (image) => image.slot === "main"
          );

          const productImage =
            mainImage?.url ||
            product.image ||
            "";

          const orderItem = {
            productId: product._id,
            variantId: variant._id,

            snapshot: {
              title: product.title,
              sku: variant.sku,
              attributes: variant.attributes || {},
              image: productImage,
              brand: product.brandId?.name || "",
              condition: product.condition,

              // Preserve the warranty terms that applied
              // at purchase time. The warranty begins
              // only when the order is delivered.
              warranty: {
                type:
                  product.warrantyType || "No Warranty",

                duration: {
                  value:
                    product.warrantyDuration?.value ?? null,

                  unit:
                    product.warrantyDuration?.unit ||
                    "Months",
                },

                policy:
                  product.warrantyPolicy || "",

                startsAt: null,
                expiresAt: null,
              },
            },

            // Legacy fields retained for compatibility.
            name: product.title,
            price: unitPrice,
            unitPrice,
            image: productImage,
            quantity: cartItem.quantity,
            subtotal: itemSubtotal,
          };

          // --------------------------------------------
          // GROUP ITEMS BY SELLER
          // --------------------------------------------

          const sellerKey = seller._id.toString();

          if (!sellerGroups.has(sellerKey)) {
            sellerGroups.set(sellerKey, {
              sellerId: seller._id,
              items: [],

              // Priority 2 financial snapshots.
              commissionRateSnapshot:
                effectiveCommissionRate,

              payoutHoldDaysSnapshot:
                payoutHoldDays,
            });
          }

          sellerGroups
            .get(sellerKey)
            .items.push(orderItem);
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

        if (
          cartTotalAmount > codMaxOrderAmount
        ) {
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

            shippingName,
            shippingPhone,
            shippingAddress,

            paymentMethod: "COD",
            paymentStatus: "pending",
            status: "pending",

            // ------------------------------------------
            // PRIORITY 2 PAYOUT SNAPSHOTS
            // ------------------------------------------

            // Preserve the commission rate that applies
            // when the customer places this order.
            commissionRateSnapshot:
              group.commissionRateSnapshot,

            // Preserve the payout hold period applicable
            // when the customer places this order.
            payoutHoldDaysSnapshot:
              group.payoutHoldDaysSnapshot,
          });
        }

        createdOrders = await Order.create(
          orderDocuments,
          { session }
        );

        // ----------------------------------------------
        // CLEAR CART AFTER SUCCESSFUL ORDER CREATION
        // ----------------------------------------------

        await Cart.deleteMany({
          userId: req.user._id,
        }).session(session);
      });

      // ------------------------------------------------
      // REMOVE INTERNAL FINANCIAL SNAPSHOTS FROM RESPONSE
      // ------------------------------------------------

      const responseOrders = createdOrders.map(
        (order) => {
          const safeOrder = order.toObject();

          delete safeOrder.commissionRateSnapshot;
          delete safeOrder.payoutHoldDaysSnapshot;
          delete safeOrder.commissionBaseAmount;
          delete safeOrder.platformCommissionAmount;
          delete safeOrder.sellerNetAmount;

          return safeOrder;
        }
      );

      return res.status(201).json({
        message:
          "Your order has been placed successfully.",
        paymentMethod: "COD",
        count: responseOrders.length,
        orders: responseOrders,
      });
    } finally {
      await session.endSession();
    }
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
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createCustomerOrder,
};
