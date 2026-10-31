
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Authentication token missing",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select(
      "_id name email role isVerified sellerStatus"
    );

    if (!user || !user.isVerified) {
      return res.status(401).json({
        message: "Invalid or unverified account",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired authentication token",
    });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Administrator access required",
    });
  }

  next();
};
const sellerOnly = (req, res, next) => {
  if (
    req.user.role === "seller" &&
    req.user.sellerStatus === "approved" &&
    req.user.isVerified
  ) {
    return next();
  }

  return res.status(403).json({
    message: "Approved seller access required"
  });
};

module.exports = { 
  protect, 
  adminOnly,
  sellerOnly
};
