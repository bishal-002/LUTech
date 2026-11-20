const express = require("express");

const {
  getAllUsers,
  getUserStats,
  updateUserRole,
  deleteUser,
  getSellerApplications,
  rejectSeller,
} = require("../controllers/adminController");

const {
  approveSeller,
} = require("../controllers/sellerApprovalController");

const {
  getAllOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
} = require("../controllers/orderController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const {
  requireAdminPermission,
} = require("../middleware/adminPermissionMiddleware");

const router = express.Router();

// Every route requires an authenticated admin account.
router.use(protect, adminOnly);

// ======================================================
// USER MANAGEMENT
// ======================================================

router.get(
  "/users/stats",
  requireAdminPermission("view_users"),
  getUserStats
);

router.get(
  "/users",
  requireAdminPermission("view_users"),
  getAllUsers
);

router.put(
  "/users/:id/role",
  requireAdminPermission("manage_admins"),
  updateUserRole
);

router.delete(
  "/users/:id",
  requireAdminPermission("ban_users"),
  deleteUser
);

// ======================================================
// SELLER APPLICATION MANAGEMENT
// ======================================================

router.get(
  "/sellers",
  requireAdminPermission("view_seller_applications"),
  getSellerApplications
);

router.put(
  "/sellers/:id/approve",
  requireAdminPermission("approve_sellers"),
  approveSeller
);

router.put(
  "/sellers/:id/reject",
  requireAdminPermission("reject_sellers"),
  rejectSeller
);

// ======================================================
// ORDER MANAGEMENT
// ======================================================

router.get(
  "/orders",
  requireAdminPermission("view_orders"),
  getAllOrders
);

router.get(
  "/orders/:id",
  requireAdminPermission("view_orders"),
  getAdminOrderById
);

// The existing permission catalog does not yet contain
// a dedicated order-status management permission.
// manage_disputes is used for this existing admin override
// until the order/dispute permissions are separated.
router.patch(
  "/orders/:id/status",
  requireAdminPermission("manage_disputes"),
  updateAdminOrderStatus
);

router.put(
  "/orders/:id/status",
  requireAdminPermission("manage_disputes"),
  updateAdminOrderStatus
);

module.exports = router;