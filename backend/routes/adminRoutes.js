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

// Existing basic seller application list.
router.get(
  "/sellers",
  requireAdminPermission("view_seller_applications"),
  getSellerApplications
);

// New KYC review queue.
// Keep this static route before routes containing :id.
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

// Private seller KYC document access.
router.get(
  "/sellers/:id/kyc/documents/:documentType",
  requireAdminPermission("view_seller_kyc"),
  downloadSellerKycDocument
);

// KYC-aware approval.
// approve_sellers continues to require administrator 2FA.
router.put(
  "/sellers/:id/approve",
  requireAdminPermission("approve_sellers"),
  approveSeller
);

// KYC-aware rejection.
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
// manage_disputes is used for the existing admin override.
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