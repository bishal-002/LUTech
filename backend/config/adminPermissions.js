// ======================================================
// ADMIN ROLES
// ======================================================

const ADMIN_ROLES = Object.freeze([
  "super_admin",
  "catalog_moderator",
  "kyc_verifier",
  "support_agent",
]);

// ======================================================
// AVAILABLE ADMIN PERMISSIONS
// ======================================================

const ADMIN_PERMISSIONS = Object.freeze([
  // Platform administration
  "manage_admins",
  "manage_platform_settings",
  "view_audit_logs",

  // User management
  "view_users",
  "ban_users",

  // Seller verification
  "view_seller_applications",
  "view_seller_kyc",
  "approve_sellers",
  "reject_sellers",
  "assign_seller_tiers",
  "verify_genuine_badge",

  // Product and catalog management
  "approve_products",
  "suspend_products",
  "manage_brands",
  "manage_categories",
  "edit_category_schemas",

  // Orders and customer support
  "view_orders",
  "manage_disputes",
  "resolve_disputes",
  "issue_refunds",
  "manage_support_tickets",

  // Finance
  "process_payouts",
]);

// ======================================================
// DEFAULT PERMISSIONS BY ADMIN ROLE
// ======================================================

const ROLE_DEFAULT_PERMISSIONS = Object.freeze({
  super_admin: [...ADMIN_PERMISSIONS],

  catalog_moderator: [
    "approve_products",
    "suspend_products",
    "manage_brands",
    "manage_categories",
    "edit_category_schemas",
  ],

  kyc_verifier: [
    "view_seller_applications",
    "view_seller_kyc",
    "approve_sellers",
    "reject_sellers",
    "assign_seller_tiers",
    "verify_genuine_badge",
  ],

  support_agent: [
    "view_users",
    "view_orders",
    "manage_disputes",
    "resolve_disputes",
    "issue_refunds",
    "manage_support_tickets",
  ],
});

// ======================================================
// HELPER FUNCTIONS
// ======================================================

const getDefaultPermissions = (adminRole) => {
  return ROLE_DEFAULT_PERMISSIONS[adminRole]
    ? [...ROLE_DEFAULT_PERMISSIONS[adminRole]]
    : [];
};

const isValidAdminRole = (adminRole) => {
  return ADMIN_ROLES.includes(adminRole);
};

const isValidPermission = (permission) => {
  return ADMIN_PERMISSIONS.includes(permission);
};

module.exports = {
  ADMIN_ROLES,
  ADMIN_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  getDefaultPermissions,
  isValidAdminRole,
  isValidPermission,
};