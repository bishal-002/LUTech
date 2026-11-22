const express = require("express");

const {
  createCustomerOrder,
} = require("../controllers/checkoutController");

const {
  getCustomerOrders,
  getCustomerOrderById,
} = require("../controllers/orderController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post(
  "/checkout",
  createCustomerOrder
);

router.get(
  "/",
  getCustomerOrders
);

router.get(
  "/:id",
  getCustomerOrderById
);

module.exports = router;