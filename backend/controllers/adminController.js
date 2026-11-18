
const mongoose = require("mongoose");
const User = require("../models/User");

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const filter = {};

    if (req.query.search?.trim()) {
      const regex = new RegExp(escapeRegex(req.query.search.trim()), "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select("_id name email role status isVerified sellerStatus verificationStatus createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        limit,
      },
    });
  } catch (error) {
    console.error("Get users:", error);
    return res.status(500).json({ message: "Unable to retrieve users." });
  }
};

const getUserStats = async (req, res) => {
  try {
    const [total, customers, sellers, admins, verified, unverified, pendingSellers] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: "customer" }),
        User.countDocuments({ role: "seller" }),
        User.countDocuments({ role: "admin" }),
        User.countDocuments({ isVerified: true }),
        User.countDocuments({ isVerified: false }),
        User.countDocuments({ sellerStatus: "pending" }),
      ]);

    return res.status(200).json({
      total,
      customers,
      sellers,
      admins,
      verified,
      unverified,
      pendingSellers,
    });
  } catch (error) {
    console.error("Get user stats:", error);
    return res.status(500).json({ message: "Unable to retrieve statistics." });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    if (!["customer", "seller", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    if (req.user._id.toString() === id) {
      return res.status(400).json({ message: "You cannot change your own role." });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role === "admin" && role !== "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });

      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot remove the last administrator.",
        });
      }
    }

    if (role === "seller") {
      return res.status(400).json({
        message: "Use the seller application approval process to grant seller access.",
      });
    }

    user.role = role;

    if (role === "customer") {
      user.sellerStatus = "not_applicable";
      user.verificationStatus = "not_submitted";
    }

    await user.save();

    return res.status(200).json({
      message: "User role updated.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Update user role:", error);
    return res.status(500).json({ message: "Unable to update user role." });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    if (req.user._id.toString() === id) {
      return res.status(400).json({
        message: "You cannot delete your own account.",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    // Prevent deactivation of the last active administrator.
    if (
      user.role === "admin" &&
      !["suspended", "deactivated"].includes(user.status)
    ) {
      const activeAdminCount = await User.countDocuments({
        role: "admin",
        status: {
          $nin: ["suspended", "deactivated"],
        },
      });

      if (activeAdminCount <= 1) {
        return res.status(400).json({
          message: "Cannot deactivate the last active administrator.",
        });
      }
    }

    // Deactivate instead of permanently deleting the account.
    user.status = "deactivated";

    await user.save();

    return res.status(200).json({
      message: "User account deactivated successfully.",
    });
  } catch (error) {
    console.error("Delete user:", error);

    return res.status(500).json({
      message: "Unable to deactivate user.",
    });
  }
};

const getSellerApplications = async (req, res) => {
  try {
    const applicants = await User.find({
      sellerStatus: "pending",
      role: { $in: ["customer", "seller"] },
    })
      .select("_id name email role isVerified sellerStatus verificationStatus storeName storeDescription storePhone storeAddress sellerApplication createdAt")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      count: applicants.length,
      applicants,
    });
  } catch (error) {
    console.error("Get seller applications:", error);
    return res.status(500).json({
      message: "Unable to retrieve seller applications.",
    });
  }
};

const approveSeller = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid applicant ID." });
    }

    const applicant = await User.findById(req.params.id);

    if (
      !applicant ||
      applicant.sellerStatus !== "pending" ||
      !["customer", "seller"].includes(applicant.role)
    ) {
      return res.status(404).json({
        message: "Pending seller application not found.",
      });
    }

    if (!applicant.isVerified) {
      return res.status(400).json({
        message: "The applicant must verify their email first.",
      });
    }

    applicant.role = "seller";
    applicant.sellerStatus = "approved";
    applicant.verificationStatus = "approved";
    applicant.adminReviewNote = "";
    applicant.sellerApplication.reviewedAt = new Date();

    await applicant.save();

    return res.status(200).json({
      message: "Seller application approved.",
      seller: {
        _id: applicant._id,
        name: applicant.name,
        email: applicant.email,
        role: applicant.role,
        sellerStatus: applicant.sellerStatus,
        verificationStatus: applicant.verificationStatus,
      },
    });
  } catch (error) {
    console.error("Approve seller:", error);
    return res.status(500).json({ message: "Unable to approve seller." });
  }
};

const rejectSeller = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid applicant ID." });
    }

    const applicant = await User.findById(req.params.id);

    if (
      !applicant ||
      applicant.sellerStatus !== "pending" ||
      !["customer", "seller"].includes(applicant.role)
    ) {
      return res.status(404).json({
        message: "Pending seller application not found.",
      });
    }

    const reviewNote = String(req.body.reviewNote || "").trim();

    applicant.sellerStatus = "rejected";
    applicant.verificationStatus = "rejected";
    applicant.adminReviewNote = reviewNote;
    applicant.sellerApplication.reviewNote = reviewNote;
    applicant.sellerApplication.reviewedAt = new Date();

    await applicant.save();

    return res.status(200).json({
      message: "Seller application rejected.",
      applicant: {
        _id: applicant._id,
        name: applicant.name,
        email: applicant.email,
        role: applicant.role,
        sellerStatus: applicant.sellerStatus,
        verificationStatus: applicant.verificationStatus,
      },
    });
  } catch (error) {
    console.error("Reject seller:", error);
    return res.status(500).json({ message: "Unable to reject seller." });
  }
};

module.exports = {
  getAllUsers,
  getUserStats,
  updateUserRole,
  deleteUser,
  getSellerApplications,
  approveSeller,
  rejectSeller,
};
