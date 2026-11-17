
const express = require("express");

const {
  registerUser,
  loginUser,
  verifyOTP,
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  applyToBecomeSeller,
  getSellerApplicationStatus,
} = require("../controllers/userController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Public Authentication Routes
|--------------------------------------------------------------------------
| These routes do not require an authentication token.
*/

// Register a new customer or seller account
router.post("/register", registerUser);

// Log in an existing account
router.post("/login", loginUser);

// Verify email using OTP
router.post("/verify-otp", verifyOTP);

/*
|--------------------------------------------------------------------------
| Protected User Routes
|--------------------------------------------------------------------------
| Every route below requires a valid authentication token.
*/

router.use(protect);

// Get user profile
router.get("/profile/:id", getUserProfile);

// Update user profile
router.put("/profile/:id", updateUserProfile);

// Delete user profile
router.delete("/profile/:id", deleteUserProfile);

/*
|--------------------------------------------------------------------------
| Seller Application Routes
|--------------------------------------------------------------------------
*/

// Submit an application to become a seller
router.post("/seller-application", applyToBecomeSeller);

// Check the current user's seller application status
router.get("/seller-application", getSellerApplicationStatus);

module.exports = router;
