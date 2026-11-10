
const express = require("express");

const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  verifyOTP,
  applyToBecomeSeller,
  getSellerApplicationStatus,
} = require("../controllers/userController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Public authentication routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/verify-otp", verifyOTP);

// Protected profile routes
router.get("/profile/:id", protect, getUserProfile);
router.put("/profile/:id", protect, updateUserProfile);
router.delete("/profile/:id", protect, deleteUserProfile);

// Customer seller application routes
router.post("/seller-application", protect, applyToBecomeSeller);
router.get("/seller-application", protect, getSellerApplicationStatus);

module.exports = router;
