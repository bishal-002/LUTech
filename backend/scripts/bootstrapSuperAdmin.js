
const path = require("path");
const dns = require("dns");

// Keep the DNS configuration consistent with server.js.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

// Load environment variables from backend/.env.
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const User = require("../models/User");
const AdminProfile = require("../models/AdminProfile");

const {
  getDefaultPermissions,
} = require("../config/adminPermissions");

// ======================================================
// BOOTSTRAP FIRST SUPER ADMIN
// ======================================================

const bootstrapSuperAdmin = async () => {
  const email = String(process.argv[2] || "")
    .trim()
    .toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(
      "Usage: node scripts/bootstrapSuperAdmin.js <admin-email>"
    );
  }

  try {
    // Connect to MongoDB.
    await connectDB();

    // Only allow this script to run before any AdminProfile exists.
    const existingProfiles = await AdminProfile.estimatedDocumentCount();

    if (existingProfiles > 0) {
      throw new Error(
        "Admin profiles already exist. Initial bootstrap is disabled."
      );
    }

    // Find the existing administrator account.
    const user = await User.findOne({ email }).select(
      "_id name email role isVerified status"
    );

    if (!user) {
      throw new Error("No user account found with that email address.");
    }

    if (user.role !== "admin") {
      throw new Error(
        "This user does not have the admin role."
      );
    }

    if (user.status !== "active") {
      throw new Error(
        "The administrator account must be active."
      );
    }

    if (!user.isVerified) {
      throw new Error(
        "The administrator must verify their email first."
      );
    }

    // Create the initial Super Admin profile.
    const permissions = getDefaultPermissions("super_admin");

    const adminProfile = await AdminProfile.create({
      userId: user._id,
      adminRole: "super_admin",
      permissions,
      department: "Engineering",
      status: "active",

      // Sensitive operations remain blocked until 2FA
      // is configured and enabled.
      security: {
        twoFactorEnabled: false,
      },
    });

    console.log("\n====================================");
    console.log("SUPER ADMIN BOOTSTRAP SUCCESSFUL");
    console.log("====================================");
    console.log("Name:", user.name);
    console.log("Email:", user.email);
    console.log("User ID:", user._id.toString());
    console.log("Admin Profile ID:", adminProfile._id.toString());
    console.log("Admin Role:", adminProfile.adminRole);
    console.log("Permissions:", adminProfile.permissions.length);
    console.log("Status:", adminProfile.status);
    console.log("2FA Enabled:", adminProfile.security.twoFactorEnabled);
    console.log("====================================\n");

    console.log(
      "Note: Seller approval and payout permissions remain blocked until 2FA is enabled."
    );
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

bootstrapSuperAdmin().catch((error) => {
  console.error("\nSuper Admin Bootstrap Failed:");
  console.error(error.message);
  process.exitCode = 1;
});
