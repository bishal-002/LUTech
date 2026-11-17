
const express = require("express");

const {
  getSellerOrders,
  getSellerOrderById,
  updateSellerOrderStatus,
} = require("../controllers/orderController");

const { protect, sellerOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, sellerOnly);

router.get("/", getSellerOrders);
router.get("/:id", getSellerOrderById);
router.patch("/:id/status", updateSellerOrderStatus);
router.put("/:id/status", updateSellerOrderStatus);

module.exports = router;
