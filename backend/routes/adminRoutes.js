
const express = require("express");

const {
  getAllUsers,
  getUserStats,
  updateUserRole,
  deleteUser,
  getSellerApplications,
} = require("../controllers/adminController");

const {
  getSellerKycQueue,
  getSellerKycDetails,
  downloadSellerKycDocument,
  approveSeller,
  rejectSeller,
} = require("../controllers/sellerKycAdminController");

const {
  upgradeSellerTier,
} = require("../controllers/sellerTierController");

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

router.get(
  "/sellers/kyc/queue",
  requireAdminPermission("view_seller_applications"),
  getSellerKycQueue
);

// Private seller KYC details.
router.get(
  "/sellers/:id/kyc",
  requireAdminPermission("view_seller_kyc"),
  getSellerKycDetails
);

// Private KYC document access.
router.get(
  "/sellers/:id/kyc/documents/:documentType",
  requireAdminPermission("view_seller_kyc"),
  downloadSellerKycDocument
);

// Seller KYC approval.
router.put(
  "/sellers/:id/approve",
  requireAdminPermission("approve_sellers"),
  approveSeller
);

// Seller KYC rejection.
router.put(
  "/sellers/:id/reject",
  requireAdminPermission("reject_sellers"),
  rejectSeller
);

// ======================================================
// SELLER TIER MANAGEMENT
// ======================================================

// Only administrators with assign_seller_tiers
// permission can upgrade an approved seller.
//
// The controller validates the existing seller KYC
// documents and writes an immutable audit record.

router.patch(
  "/sellers/:id/upgrade-tier",
  requireAdminPermission("assign_seller_tiers"),
  upgradeSellerTier
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

// Existing admin order-status override.
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
