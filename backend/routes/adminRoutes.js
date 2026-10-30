
const express = require("express");

const {
  getAllUsers,
  getUserStats,
  updateUserRole,
  deleteUser,
} = require("../controllers/adminController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require Admin authentication
router.use(protect, adminOnly);

// Get user statistics
router.get("/users/stats", getUserStats);

// Get all users
router.get("/users", getAllUsers);

// Update user role
router.put("/users/:id/role", updateUserRole);

// Delete user
router.delete("/users/:id", deleteUser);

module.exports = router;
