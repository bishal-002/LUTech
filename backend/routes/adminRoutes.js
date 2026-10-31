
const express = require("express");

const {
  getAllUsers,
  getUserStats,
  updateUserRole,
  deleteUser,
  getSellerApplications,
  approveSeller,
  rejectSeller
} = require("../controllers/adminController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require Admin authentication
router.use(protect, adminOnly);

// User management
router.get("/users/stats", getUserStats);
router.get("/users", getAllUsers);
router.put("/users/:id/role", updateUserRole);
router.delete("/users/:id", deleteUser);

// Seller application management
router.get("/sellers", getSellerApplications);
router.put("/sellers/:id/approve", approveSeller);
router.put("/sellers/:id/reject", rejectSeller);

module.exports = router;
