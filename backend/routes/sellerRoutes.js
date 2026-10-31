
const express = require("express");

const {
  protect,
  sellerOnly
} = require("../middleware/authMiddleware");

const router = express.Router();

// All seller routes require authentication and approval
router.use(protect, sellerOnly);

// Seller dashboard
router.get("/dashboard", (req, res) => {
  res.status(200).json({
    message: "Welcome to your Seller Dashboard",
    seller: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      sellerStatus: req.user.sellerStatus
    }
  });
});

module.exports = router;
