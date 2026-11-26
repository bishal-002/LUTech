const AdminProfile = require("../models/AdminProfile");

const {
  isValidPermission,
} = require("../config/adminPermissions");

// Financial/dispute decisions require a recently verified admin session.
const TWO_FACTOR_REQUIRED_PERMISSIONS = [
  "approve_sellers",
  "process_payouts",
  "resolve_disputes",
  "issue_refunds",
];

const requireAdminPermission = (requiredPermission) => {
  if (!isValidPermission(requiredPermission)) {
    throw new Error(
      `Invalid admin permission configured: ${requiredPermission}`
    );
  }

  return async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
          message: "Administrator access required.",
        });
      }

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

      if (adminProfile.status !== "active") {
        return res.status(403).json({
          message:
            adminProfile.status === "revoked"
              ? "Your administrator access has been revoked."
              : "Your administrator account is suspended.",
        });
      }

      if (
        !Array.isArray(adminProfile.permissions) ||
        !adminProfile.permissions.includes(requiredPermission)
      ) {
        return res.status(403).json({
          message: "You do not have permission to perform this action.",
          requiredPermission,
        });
      }

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