
const User = require("../models/User");

// Escape special characters in search input
const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/admin/users
// Retrieve users with search and pagination
const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const search = req.query.search?.trim();
    const filter = {};

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");

      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
      ];
    }

    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select("_id name email role isVerified createdAt")
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
    console.error("Get all users error:", error);

    return res.status(500).json({
      message: "Failed to retrieve users",
    });
  }
};

// GET /api/admin/users/stats
// Retrieve user statistics
const getUserStats = async (req, res) => {
  try {
    const [total, customers, sellers, admins, verified, unverified] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: "customer" }),
        User.countDocuments({ role: "seller" }),
        User.countDocuments({ role: "admin" }),
        User.countDocuments({ isVerified: true }),
        User.countDocuments({ isVerified: false }),
      ]);

    return res.status(200).json({
      total,
      customers,
      sellers,
      admins,
      verified,
      unverified,
    });
  } catch (error) {
    console.error("Get user stats error:", error);

    return res.status(500).json({
      message: "Failed to retrieve user statistics",
    });
  }
};

// PUT /api/admin/users/:id/role
// Change a user's role
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    const allowedRoles = ["customer", "seller", "admin"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid user role",
      });
    }

    // Prevent an Admin from changing their own role
    if (req.user._id.toString() === id) {
      return res.status(400).json({
        message: "You cannot change your own role",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Prevent removal of the last Admin
    if (user.role === "admin" && role !== "admin") {
      const adminCount = await User.countDocuments({
        role: "admin",
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot remove the last administrator",
        });
      }
    }

    user.role = role;
    await user.save();

    return res.status(200).json({
      message: "User role updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Update user role error:", error);

    return res.status(500).json({
      message: "Failed to update user role",
    });
  }
};

// DELETE /api/admin/users/:id
// Delete a user account
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent an Admin from deleting their own account
    if (req.user._id.toString() === id) {
      return res.status(400).json({
        message: "You cannot delete your own account",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Prevent deletion of the last Admin
    if (user.role === "admin") {
      const adminCount = await User.countDocuments({
        role: "admin",
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot delete the last administrator",
        });
      }
    }

    await user.deleteOne();

    return res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);

    return res.status(500).json({
      message: "Failed to delete user",
    });
  }
};



const getSellerApplications = async (req, res) => {
  try {
    const applicants = await User.find({
      $or: [
        { role: "seller", sellerStatus: "pending" },
        { role: "customer", sellerStatus: "pending" },
      ],
    }).select(
      "_id name email role isVerified sellerStatus storeName storeDescription storePhone storeAddress sellerApplication createdAt"
    );

    return res.status(200).json({
      count: applicants.length,
      applicants,
    });
  } catch (error) {
    console.error("Get seller applications error:", error);
    return res.status(500).json({
      message: "Failed to retrieve seller applications",
    });
  }
};

const approveSeller = async (req, res) => {
  try {
    const applicant = await User.findById(req.params.id);

    if (
      !applicant ||
      applicant.sellerStatus !== "pending" ||
      !["customer", "seller"].includes(applicant.role)
    ) {
      return res.status(404).json({
        message: "Pending seller application not found",
      });
    }

    if (!applicant.isVerified) {
      return res.status(400).json({
        message: "Applicant must verify their email first",
      });
    }

    // Convert an approved customer applicant into a seller.
    applicant.role = "seller";
    applicant.sellerStatus = "approved";
    applicant.sellerApplication.reviewedAt = new Date();

    await applicant.save();

    return res.status(200).json({
      message: "Seller application approved successfully",
      seller: {
        _id: applicant._id,
        name: applicant.name,
        email: applicant.email,
        role: applicant.role,
        sellerStatus: applicant.sellerStatus,
      },
    });
  } catch (error) {
    console.error("Approve seller error:", error);
    return res.status(500).json({
      message: "Failed to approve seller application",
    });
  }
};

const rejectSeller = async (req, res) => {
  try {
    const applicant = await User.findById(req.params.id);

    if (
      !applicant ||
      applicant.sellerStatus !== "pending" ||
      !["customer", "seller"].includes(applicant.role)
    ) {
      return res.status(404).json({
        message: "Pending seller application not found",
      });
    }

    applicant.sellerStatus = "rejected";

    // A customer remains a customer if their application is rejected.
    // An existing seller registration remains a seller.
    applicant.sellerApplication.reviewedAt = new Date();

    await applicant.save();

    return res.status(200).json({
      message: "Seller application rejected",
      applicant: {
        _id: applicant._id,
        name: applicant.name,
        email: applicant.email,
        role: applicant.role,
        sellerStatus: applicant.sellerStatus,
      },
    });
  } catch (error) {
    console.error("Reject seller error:", error);
    return res.status(500).json({
      message: "Failed to reject seller application",
    });
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
