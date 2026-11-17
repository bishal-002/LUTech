
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect routes that require an authenticated user
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;

    if (!userId) {
      return res.status(401).json({
        message: "Invalid authentication token.",
      });
    }

    const user = await User.findById(userId).select(
      "_id name email role isVerified sellerStatus verificationStatus"
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

    if (
      user.sellerStatus === "suspended" ||
      user.verificationStatus === "suspended"
    ) {
      return res.status(403).json({
        message: "Your account has been suspended.",
      });
    }

    req.user = user;
    next();
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

// Allow only administrators
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Administrator access required.",
    });
  }

  next();
};

// Allow only approved sellers
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
      message: "Your seller application has not been approved yet.",
      sellerStatus: req.user.sellerStatus,
    });
  }

  if (
    req.user.verificationStatus === "rejected" ||
    req.user.verificationStatus === "suspended"
  ) {
    return res.status(403).json({
      message: "Your seller verification is not approved.",
      verificationStatus: req.user.verificationStatus,
    });
  }

  next();
};

module.exports = {
  protect,
  adminOnly,
  sellerOnly,
};
