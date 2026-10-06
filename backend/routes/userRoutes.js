const express = require("express");

const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  verifyOTP
} = require("../controllers/userController");

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/verify-otp", verifyOTP);

router.get("/profile/:id", getUserProfile);

router.put("/profile/:id", updateUserProfile);

router.delete("/profile/:id", deleteUserProfile);

module.exports = router;