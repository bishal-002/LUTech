const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

const getCart = async (req, res) => {
  try {
    const items = await Cart.find({ userId: req.user._id })
      .populate({
        path: "productId",
        select: "title name images image variants sellerId",
      })
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("Get cart error:", error);
    return res.status(500).json({ message: "Unable to retrieve cart." });
  }
};

const addToCart = async (req, res) => {
  try {
    const { productId, variantId } = req.body;
    const quantity = Number(req.body.quantity ?? 1);

    if (
      !mongoose.isValidObjectId(productId) ||
      !mongoose.isValidObjectId(variantId) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99
    ) {
      return res.status(400).json({ message: "Invalid cart item details." });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const variant = product.variants.id(variantId);

    if (!variant) {
      return res.status(404).json({ message: "Product variant not found." });
    }

    // Calculate the maximum quantity that can be added
    const maxAllowedQuantity = Math.min(
      variant.stockQuantity,
      variant.maxOrderQuantity || 99
    );

    // Find the existing cart item
    const existingItem = await Cart.findOne({
      userId: req.user._id,
      productId,
      variantId,
    });

    // Calculate the final quantity before updating
    const existingQuantity = existingItem ? existingItem.quantity : 0;
    const newTotalQuantity = existingQuantity + quantity;

    // Validate the combined quantity
    if (newTotalQuantity > maxAllowedQuantity) {
      return res.status(400).json({
        message: `Available quantity is ${maxAllowedQuantity}. You already have ${existingQuantity} in your cart.`,
      });
    }

    let item;

    if (existingItem) {
      // Update only if the quantity has not changed since it was read
      item = await Cart.findOneAndUpdate(
        {
          _id: existingItem._id,
          quantity: existingQuantity,
        },
        {
          $inc: { quantity },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!item) {
        return res.status(409).json({
          message: "Cart item changed. Please try again.",
        });
      }
    } else {
      // Create a new cart item
      item = await Cart.create({
        userId: req.user._id,
        productId,
        variantId,
        quantity,
      });
    }

    return res.status(201).json({
      message: "Item added to cart.",
      item,
    });
  } catch (error) {
    console.error("Add to cart error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "This item is already being updated. Please retry.",
      });
    }

    return res.status(500).json({ message: "Unable to add item to cart." });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const quantity = Number(req.body.quantity);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({
        message: "Quantity must be a whole number between 1 and 99.",
      });
    }

    const item = await Cart.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!item) {
      return res.status(404).json({ message: "Cart item not found." });
    }

    const product = await Product.findById(item.productId);
    const variant = product?.variants.id(item.variantId);

    if (!variant) {
      return res.status(404).json({
        message: "The selected product variant is unavailable.",
      });
    }

    const maxQuantity = Math.min(
      variant.stockQuantity,
      variant.maxOrderQuantity || 99
    );

    if (quantity > maxQuantity) {
      return res.status(400).json({
        message: `Available quantity is ${maxQuantity}.`,
      });
    }

    item.quantity = quantity;
    await item.save();

    return res.status(200).json({
      message: "Cart quantity updated.",
      item,
    });
  } catch (error) {
    console.error("Update cart error:", error);
    return res.status(500).json({ message: "Unable to update cart item." });
  }
};

const removeCartItem = async (req, res) => {
  try {
    const item = await Cart.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!item) {
      return res.status(404).json({ message: "Cart item not found." });
    }

    return res.status(200).json({ message: "Cart item removed." });
  } catch (error) {
    console.error("Remove cart item error:", error);
    return res.status(500).json({ message: "Unable to remove cart item." });
  }
};

const clearCart = async (req, res) => {
  try {
    await Cart.deleteMany({ userId: req.user._id });

    return res.status(200).json({ message: "Cart cleared successfully." });
  } catch (error) {
    console.error("Clear cart error:", error);
    return res.status(500).json({ message: "Unable to clear cart." });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};