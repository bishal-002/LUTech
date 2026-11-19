
const express = require("express");

const {
  registerUser,
  verifyOTP,
  resendOTP,
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  applyToBecomeSeller,
  getSellerApplicationStatus,
} = require("../controllers/userController");

const {
  loginUser,
  verifyAdminLoginTwoFactor,
} = require("../controllers/authController");

const customerController = require("../controllers/customerController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ======================================================
// PUBLIC AUTHENTICATION ROUTES
// ======================================================

router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/verify-otp", verifyOTP);

router.post("/resend-otp", resendOTP);

// Admin second-factor verification is public because
// the user does not have an access token yet.
router.post(
  "/admin-2fa/verify",
  verifyAdminLoginTwoFactor
);

// ======================================================
// PROTECTED ROUTES
// ======================================================

router.use(protect);

// Existing user profile routes.
router.get("/profile/:id", getUserProfile);

router.put("/profile/:id", updateUserProfile);

router.delete("/profile/:id", deleteUserProfile);

// ======================================================
// CUSTOMER PROFILE ROUTES
// ======================================================

router.get(
  "/customer/profile",
  customerController.getCustomerProfile
);

router.put(
  "/customer/profile",
  customerController.updateCustomerProfile
);

// ======================================================
// CUSTOMER SHOPPING ROUTES
// ======================================================

router.post(
  "/customer/wishlist",
  customerController.addToWishlist
);

router.delete(
  "/customer/wishlist/:productId",
  customerController.removeFromWishlist
);

router.post(
  "/customer/price-alerts",
  customerController.addPriceAlert
);

router.delete(
  "/customer/price-alerts/:productId",
  customerController.removePriceAlert
);

router.post(
  "/customer/recently-viewed",
  customerController.addRecentlyViewed
);

// ======================================================
// SELLER APPLICATION ROUTES
// ======================================================

router.post(
  "/seller-application",
  applyToBecomeSeller
);

router.get(
  "/seller-application",
  getSellerApplicationStatus
);

module.exports = router;
