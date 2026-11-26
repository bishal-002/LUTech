const express = require("express");

const {
  createCustomerDispute,
  getCustomerDisputes,
  getCustomerDisputeById,
  updateCustomerRefundDestination,
  addDisputeMessage,
} = require("../controllers/disputeController");

const { protect } = require("../middleware/authMiddleware");
const customerOnly = require("../middleware/customerOnly");

const router = express.Router();

router.use(protect, customerOnly);

// Open a dispute for a delivered order.
router.post("/", createCustomerDispute);

// List the authenticated customer's disputes.
router.get("/", getCustomerDisputes);

// View one of the customer's disputes.
router.get("/:id", getCustomerDisputeById);

// Add or update encrypted bank/MFS refund details.
router.patch(
  "/:id/refund-destination",
  updateCustomerRefundDestination
);

// Reply to the dispute conversation.
router.post("/:id/messages", addDisputeMessage);

module.exports = router;