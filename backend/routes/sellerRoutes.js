
const express = require("express");
const { protect, sellerOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, sellerOnly);

router.get("/dashboard", (req, res) => {
  return res.status(200).json({
    message: "Welcome to your Seller Dashboard",
    seller: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      sellerStatus: req.user.sellerStatus,
      verificationStatus: req.user.verificationStatus,
    },
  });
});

module.exports = router;
