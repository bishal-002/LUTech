const express = require("express");

const {
  getSellerDisputes,
  getSellerDisputeById,
  addDisputeMessage,
} = require("../controllers/disputeController");

const {
  protect,
  sellerOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, sellerOnly);

// List disputes concerning this seller's orders.
router.get("/", getSellerDisputes);

// View one of this seller's disputes.
router.get("/:id", getSellerDisputeById);

// Respond to a dispute.
router.post("/:id/respond", addDisputeMessage);

// General message endpoint.
router.post("/:id/messages", addDisputeMessage);

module.exports = router;