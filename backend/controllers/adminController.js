
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
    const sellers = await User.find({
      role: "seller",
      sellerStatus: "pending"
    }).select("_id name email isVerified sellerStatus createdAt");

    return res.status(200).json({
      count: sellers.length,
      sellers
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server Error"
    });
  }
};

const approveSeller = async (req, res) => {
  try {
    const seller = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: "seller",
        sellerStatus: "pending",
        isVerified: true
      },
      { sellerStatus: "approved" },
      { new: true }
    ).select("_id name email role sellerStatus");

    if (!seller) {
      return res.status(400).json({
        message: "Seller not found, not verified, or already processed"
      });
    }

    return res.status(200).json({
      message: "Seller approved successfully",
      seller
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server Error"
    });
  }
};

const rejectSeller = async (req, res) => {
  try {
    const seller = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: "seller",
        sellerStatus: "pending"
      },
      { sellerStatus: "rejected" },
      { new: true }
    ).select("_id name email role sellerStatus");

    if (!seller) {
      return res.status(404).json({
        message: "Pending seller application not found"
      });
    }

    return res.status(200).json({
      message: "Seller application rejected",
      seller
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server Error"
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
