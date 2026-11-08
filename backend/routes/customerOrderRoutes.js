
const express = require("express");

const {
  createCustomerOrder,
  getCustomerOrders,
  getCustomerOrderById,
} = require("../controllers/orderController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// Customer checkout
router.post("/checkout", createCustomerOrder);

// Customer order history
router.get("/", getCustomerOrders);

// Individual customer order details
router.get("/:id", getCustomerOrderById);

module.exports = router;
