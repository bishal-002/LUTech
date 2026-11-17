
const express = require("express");

const {
  createCustomerOrder,
  getCustomerOrders,
  getCustomerOrderById,
} = require("../controllers/orderController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/checkout", createCustomerOrder);
router.get("/", getCustomerOrders);
router.get("/:id", getCustomerOrderById);

module.exports = router;
