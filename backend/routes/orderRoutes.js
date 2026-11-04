
const express = require("express");

const {
  getSellerOrders,
  getSellerOrderById,
  updateSellerOrderStatus,
} = require("../controllers/orderController");

const {
  protect,
  sellerOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require approved Seller authentication
router.use(protect, sellerOnly);

// Get all seller orders
router.get("/", getSellerOrders);

// Get single seller order
router.get("/:id", getSellerOrderById);

// Update seller order status
router.put("/:id/status", updateSellerOrderStatus);

module.exports = router;
