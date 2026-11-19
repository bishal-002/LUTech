
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const AdminProfile = require("../models/AdminProfile");

const {
  isIpAllowed,
} = require("../services/adminSecurityService");

// ======================================================
// AUTHENTICATION MIDDLEWARE
// ======================================================

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required. Please log in.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Authentication token missing.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured.");

      return res.status(500).json({
        message: "Authentication service is not configured.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // A second-factor challenge token is not an access token.
    if (decoded.purpose === "admin_2fa") {
      return res.status(401).json({
        message:
          "Complete administrator two-factor verification before accessing this resource.",
        code: "ADMIN_2FA_CHALLENGE_ONLY",
      });
    }

    if (
      decoded.tokenType &&
      decoded.tokenType !== "access"
    ) {
      return res.status(401).json({
        message: "Invalid access token.",
      });
    }

    const userId = decoded.userId || decoded.id;

    if (!userId) {
      return res.status(401).json({
        message: "Invalid authentication token.",
      });
    }

    const user = await User.findById(userId).select(
      "_id name email role isVerified status sellerStatus verificationStatus sellerType"
    );

    if (!user) {
      return res.status(401).json({
        message: "User account not found.",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before continuing.",
      });
    }

    // ==================================================
    // USER ACCOUNT STATUS
    // ==================================================

    if (user.status && user.status !== "active") {
      return res.status(403).json({
        message:
          user.status === "deactivated"
            ? "This account has been deactivated."
            : "Your account has been suspended.",
      });
    }

    // ==================================================
    // SELLER SUSPENSION CHECKS
    // ==================================================

    if (
      user.sellerStatus === "suspended" ||
      user.verificationStatus === "suspended"
    ) {
      return res.status(403).json({
        message: "Your account has been suspended.",
      });
    }

    // ==================================================
    // GLOBAL ADMIN SECURITY ENFORCEMENT
    // ==================================================

    if (user.role === "admin") {
      const adminProfile = await AdminProfile.findOne({
        userId: user._id,
      })
        .select(
          [
            "adminRole",
            "department",
            "status",
            "security.allowedIps",
            "security.twoFactorEnabled",
            "security.passwordChangedAt",
          ].join(" ")
        )
        .lean();

      if (!adminProfile) {
        return res.status(403).json({
          message: "Administrator profile is not configured.",
          code: "ADMIN_PROFILE_MISSING",
        });
      }

      // Block suspended and revoked administrators immediately.
      if (adminProfile.status !== "active") {
        return res.status(403).json({
          message:
            adminProfile.status === "revoked"
              ? "Your administrator access has been revoked."
              : "Your administrator account is suspended.",
          code:
            adminProfile.status === "revoked"
              ? "ADMIN_ACCESS_REVOKED"
              : "ADMIN_ACCOUNT_SUSPENDED",
        });
      }

      // Invalidate tokens issued before the last password change.
      const passwordChangedAt =
        adminProfile.security?.passwordChangedAt;

      if (
        passwordChangedAt &&
        Number(decoded.iat || 0) <
          Math.floor(passwordChangedAt.getTime() / 1000) + 1
      ) {
        return res.status(401).json({
          message:
            "Your administrator password has changed. Please log in again.",
          code: "ADMIN_SESSION_INVALIDATED",
        });
      }

      // When 2FA is enabled, require a token issued after
      // successful second-factor verification.
      if (
        adminProfile.security?.twoFactorEnabled &&
        !(
          Array.isArray(decoded.amr) &&
          decoded.amr.includes("otp")
        )
      ) {
        return res.status(401).json({
          message:
            "Complete two-factor authentication before accessing administrator resources.",
          code: "ADMIN_2FA_REQUIRED",
        });
      }

      // IP restrictions apply to Super Admins and Finance.
      const requiresIpRestriction =
        adminProfile.adminRole === "super_admin" ||
        adminProfile.department === "Finance";

      const allowedIps =
        adminProfile.security?.allowedIps || [];

      if (!Array.isArray(allowedIps)) {
        return res.status(403).json({
          message: "Administrator IP configuration is invalid.",
          code: "ADMIN_IP_CONFIGURATION_INVALID",
        });
      }

      // An empty whitelist means no IP restriction.
      if (
        requiresIpRestriction &&
        allowedIps.length > 0
      ) {
        const requestIp =
          req.ip || req.socket?.remoteAddress || "";

        if (!isIpAllowed(requestIp, allowedIps)) {
          return res.status(403).json({
            message:
              "Administrator access is not allowed from this IP address.",
            code: "ADMIN_IP_NOT_ALLOWED",
          });
        }
      }

      req.adminProfile = adminProfile;
      req.authMethods = Array.isArray(decoded.amr)
        ? decoded.amr
        : [];
    }

    req.user = user;

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Your session has expired. Please log in again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid authentication token.",
      });
    }

    console.error("Authentication error:", error);

    return res.status(500).json({
      message: "Authentication failed. Please try again.",
    });
  }
};

// ======================================================
// ADMIN MIDDLEWARE
// ======================================================

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Administrator access required.",
    });
  }

  return next();
};

// ======================================================
// SELLER MIDDLEWARE
// ======================================================

const sellerOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  if (req.user.role !== "seller") {
    return res.status(403).json({
      message: "Seller account required.",
    });
  }

  if (req.user.sellerStatus !== "approved") {
    return res.status(403).json({
      message:
        "Your seller application has not been approved yet.",
      sellerStatus: req.user.sellerStatus,
    });
  }

  if (req.user.verificationStatus !== "approved") {
    return res.status(403).json({
      message:
        "Your seller verification has not been approved.",
      verificationStatus: req.user.verificationStatus,
    });
  }

  return next();
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  protect,
  adminOnly,
  sellerOnly,
};
