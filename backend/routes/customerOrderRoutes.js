
const express = require("express");

const {
  createCustomerOrder,
} = require("../controllers/orderController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/checkout", protect, createCustomerOrder);

module.exports = router;
