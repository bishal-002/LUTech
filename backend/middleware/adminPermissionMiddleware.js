
const AdminProfile = require("../models/AdminProfile");

const {
  isValidPermission,
} = require("../config/adminPermissions");

// Permissions that require enabled two-factor authentication.
const TWO_FACTOR_REQUIRED_PERMISSIONS = [
  "approve_sellers",
  "process_payouts",
];

// ======================================================
// ADMIN PERMISSION MIDDLEWARE
// ======================================================

const requireAdminPermission = (requiredPermission) => {
  if (!isValidPermission(requiredPermission)) {
    throw new Error(
      `Invalid admin permission configured: ${requiredPermission}`
    );
  }

  return async (req, res, next) => {
    try {
      // Ensure the request has an authenticated admin.
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
          message: "Administrator access required.",
        });
      }

      // Retrieve the admin's separate profile.
      const adminProfile = await AdminProfile.findOne({
        userId: req.user._id,
      })
        .select("adminRole permissions status security.twoFactorEnabled")
        .lean();

      if (!adminProfile) {
        return res.status(403).json({
          message: "Admin profile has not been configured.",
        });
      }

      // Check admin account status.
      if (adminProfile.status !== "active") {
        return res.status(403).json({
          message:
            adminProfile.status === "revoked"
              ? "Your administrator access has been revoked."
              : "Your administrator account is suspended.",
        });
      }

      // Check the explicitly assigned permission.
      if (
        !Array.isArray(adminProfile.permissions) ||
        !adminProfile.permissions.includes(requiredPermission)
      ) {
        return res.status(403).json({
          message: "You do not have permission to perform this action.",
          requiredPermission,
        });
      }

      // Enforce 2FA for sensitive permissions.
      if (
        TWO_FACTOR_REQUIRED_PERMISSIONS.includes(requiredPermission) &&
        !adminProfile.security?.twoFactorEnabled
      ) {
        return res.status(403).json({
          message:
            "Enable two-factor authentication before performing this action.",
          code: "ADMIN_2FA_REQUIRED",
        });
      }

      // Make the profile available to the controller.
      req.adminProfile = adminProfile;

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

module.exports = {
  requireAdminPermission,
};
