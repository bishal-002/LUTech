require("dotenv").config();

const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");

const {
  isAllowedAdminEmail,
} = require("../services/adminPolicyService");

const createAdmin = async () => {
  try {
    const {
      ADMIN_NAME,
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
      MONGO_URI,
    } = process.env;

    if (
      !ADMIN_NAME ||
      !ADMIN_EMAIL ||
      !ADMIN_PASSWORD ||
      !MONGO_URI
    ) {
      throw new Error(
        "ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, and MONGO_URI must be configured."
      );
    }

    if (ADMIN_NAME.trim().length < 2 ||
        ADMIN_NAME.trim().length > 80) {
      throw new Error(
        "Admin name must contain between 2 and 80 characters."
      );
    }

    if (ADMIN_PASSWORD.length < 12) {
      throw new Error(
        "Admin password must be at least 12 characters long."
      );
    }

    const email = ADMIN_EMAIL.trim().toLowerCase();

    if (!isAllowedAdminEmail(email)) {
      throw new Error(
        "ADMIN_EMAIL must belong to an authorized official email domain. Configure ADMIN_ALLOWED_EMAIL_DOMAINS first."
      );
    }

    await mongoose.connect(MONGO_URI);

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new Error(
        "An account with this email already exists. No changes were made."
      );
    }

    const hashedPassword = await bcrypt.hash(
      ADMIN_PASSWORD,
      12
    );

    await User.create({
      name: ADMIN_NAME.trim(),
      email,
      password: hashedPassword,
      role: "admin",
      isVerified: true,
      otp: null,
      otpExpires: null,
    });

    console.log(
      "Initial Admin account created successfully."
    );
  } catch (error) {
    console.error(
      "Admin setup failed:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

createAdmin();