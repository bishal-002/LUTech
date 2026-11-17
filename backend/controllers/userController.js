
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// ======================================================
// SAFE RESPONSE FIELDS
// ======================================================

const PUBLIC_SELLER_FIELDS = [
  "_id",
  "name",
  "email",
  "storeName",
  "storeSlug",
  "logoUrl",
  "bannerUrl",
  "tagline",
  "about",
  "sellerType",
  "specialties",
  "publicAddress",
  "supportHours",
  "supportPhone",
  "supportEmail",
  "defaults",
  "metrics",
  "createdAt",
].join(" ");

const SAFE_USER_FIELDS = [
  "_id",
  "name",
  "email",
  "role",
  "isVerified",
  "address",
  "sellerStatus",
  "verificationStatus",
  "createdAt",
  "updatedAt",
].join(" ");

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const sendServerError = (res, message = "Server Error") =>
  res.status(500).json({ message });

const isPlainObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

const generateOTP = () =>
  String(Math.floor(100000 + Math.random() * 900000));

const createEmailTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

// ======================================================
// REGISTER USER
// ======================================================

const registerUser = async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = normalizeEmail(req.body.email);
    const accountType = req.body.accountType || "customer";

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        message: "Name, email, and password are required.",
      });
    }

    if (name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({
        message: "Name must be between 2 and 100 characters.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "Please provide a valid email.",
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters.",
      });
    }

    if (!["customer", "seller"].includes(accountType)) {
      return res.status(400).json({
        message: "Invalid account type.",
      });
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("Email credentials are not configured.");

      return sendServerError(
        res,
        "Email service is not configured."
      );
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    await User.create({
      name: name.trim(),
      email,
      password: hashedPassword,
      role: accountType,
      sellerStatus:
        accountType === "seller" ? "pending" : "not_applicable",
      verificationStatus:
        accountType === "seller" ? "pending_review" : "pending_review",
      otp,
      otpExpires,
      isVerified: false,
    });

    try {
      const transporter = createEmailTransporter();

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "LUTech Email Verification",
        text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
      });
    } catch (mailError) {
      console.error("OTP email delivery failed:", mailError);

      return res.status(503).json({
        message:
          "Your account was created, but the verification email could not be sent. Please contact support.",
      });
    }

    return res.status(201).json({
      message: "Registered successfully. OTP sent to your email.",
    });
  } catch (error) {
    console.error("Register user error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email is already registered.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return sendServerError(res);
  }
};

// ======================================================
// LOGIN USER
// ======================================================

const loginUser = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "Please provide a valid email.",
      });
    }

    // Password is select:false in the User model.
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email first.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured.");

      return sendServerError(
        res,
        "Authentication service is not configured."
      );
    }

    if (
      user.sellerStatus === "suspended" ||
      user.verificationStatus === "suspended"
    ) {
      return res.status(403).json({
        message: "Your account has been suspended.",
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "customer",
        sellerStatus: user.sellerStatus || "not_applicable",
        verificationStatus:
          user.verificationStatus || "pending_review",
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Login user error:", error);
    return sendServerError(res);
  }
};

// ======================================================
// VERIFY OTP
// ======================================================

const verifyOTP = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    const otp =
      typeof req.body.otp === "string"
        ? req.body.otp.trim()
        : "";

    if (!email || !isValidEmail(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: "A valid email and six-digit OTP are required.",
      });
    }

    const user = await User.findOne({ email }).select(
      "+otp +otpExpires"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        message: "Account already verified.",
      });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP.",
      });
    }

    if (!user.otpExpires || user.otpExpires.getTime() < Date.now()) {
      return res.status(400).json({
        message: "OTP expired.",
      });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save();

    return res.status(200).json({
      message: "Email verified successfully.",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return sendServerError(res);
  }
};

// ======================================================
// GET USER PROFILE
// ======================================================

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select(SAFE_USER_FIELDS);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      user,
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    return sendServerError(res);
  }
};

// ======================================================
// UPDATE USER PROFILE
// ======================================================

const updateUserProfile = async (req, res) => {
  try {
    const { name, address } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        name.trim().length < 2 ||
        name.trim().length > 100
      ) {
        return res.status(400).json({
          message: "Name must be between 2 and 100 characters.",
        });
      }

      user.name = name.trim();
    }

    if (address !== undefined) {
      if (
        typeof address !== "string" ||
        address.trim().length > 500
      ) {
        return res.status(400).json({
          message: "Address must be valid text up to 500 characters.",
        });
      }

      user.address = address.trim();
    }

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        address: user.address,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Update user profile error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return sendServerError(res);
  }
};

// ======================================================
// DELETE USER PROFILE
// ======================================================

const deleteUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    await user.deleteOne();

    return res.status(200).json({
      message: "Account deleted successfully.",
    });
  } catch (error) {
    console.error("Delete user profile error:", error);
    return sendServerError(res);
  }
};

// ======================================================
// GET SELLER PROFILE
// ======================================================

const getSellerProfile = async (req, res) => {
  try {
    const seller = await User.findOne({
      _id: req.user._id,
      role: "seller",
      sellerStatus: "approved",
      isVerified: true,
    }).select(PUBLIC_SELLER_FIELDS);

    if (!seller) {
      return res.status(404).json({
        message: "Seller profile not found.",
      });
    }

    return res.status(200).json({
      message: "Seller profile retrieved successfully.",
      seller,
    });
  } catch (error) {
    console.error("Get seller profile error:", error);

    return sendServerError(
      res,
      "Failed to retrieve seller profile."
    );
  }
};

// ======================================================
// UPDATE SELLER PROFILE
// ======================================================

const updateSellerProfile = async (req, res) => {
  try {
    const seller = await User.findOne({
      _id: req.user._id,
      role: "seller",
      sellerStatus: "approved",
      isVerified: true,
    });

    if (!seller) {
      return res.status(404).json({
        message: "Seller profile not found.",
      });
    }

    // Only these fields can be changed by the seller.
    // Admin-controlled and private fields are excluded.
    const allowedFields = [
      "storeName",
      "logoUrl",
      "bannerUrl",
      "tagline",
      "about",
      "specialties",
      "publicAddress",
      "supportHours",
      "supportPhone",
      "supportEmail",
      "defaults",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid profile fields provided.",
      });
    }

    // Store name validation.
    if (updates.storeName !== undefined) {
      if (
        typeof updates.storeName !== "string" ||
        updates.storeName.trim().length < 3 ||
        updates.storeName.trim().length > 50
      ) {
        return res.status(400).json({
          message: "Store name must be between 3 and 50 characters.",
        });
      }

      updates.storeName = updates.storeName.trim();
    }

    // Image URL validation.
    for (const field of ["logoUrl", "bannerUrl"]) {
      if (updates[field] !== undefined) {
        if (
          typeof updates[field] !== "string" ||
          !updates[field].trim()
        ) {
          return res.status(400).json({
            message: `${field} must be a valid URL.`,
          });
        }

        try {
          const parsedUrl = new URL(updates[field].trim());

          if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            throw new Error("Invalid protocol");
          }

          updates[field] = parsedUrl.toString();
        } catch {
          return res.status(400).json({
            message: `${field} must be a valid HTTP or HTTPS URL.`,
          });
        }
      }
    }

    // Tagline validation.
    if (updates.tagline !== undefined) {
      if (
        typeof updates.tagline !== "string" ||
        updates.tagline.trim().length > 100
      ) {
        return res.status(400).json({
          message: "Tagline cannot exceed 100 characters.",
        });
      }

      updates.tagline = updates.tagline.trim();
    }

    // About/description validation.
    if (updates.about !== undefined) {
      if (
        typeof updates.about !== "string" ||
        updates.about.trim().length < 50 ||
        updates.about.trim().length > 1000
      ) {
        return res.status(400).json({
          message:
            "Store description must be between 50 and 1000 characters.",
        });
      }

      updates.about = updates.about.trim();
    }

    // Specialties validation.
    if (updates.specialties !== undefined) {
      if (
        !Array.isArray(updates.specialties) ||
        updates.specialties.length < 1 ||
        updates.specialties.length > 5 ||
        updates.specialties.some(
          (item) =>
            typeof item !== "string" ||
            !item.trim() ||
            item.trim().length > 50
        )
      ) {
        return res.status(400).json({
          message: "Provide between 1 and 5 valid specialties.",
        });
      }

      updates.specialties = [
        ...new Set(
          updates.specialties.map((item) => item.trim())
        ),
      ];

      if (updates.specialties.length < 1) {
        return res.status(400).json({
          message: "At least one specialty is required.",
        });
      }
    }

    // Support phone validation.
    if (updates.supportPhone !== undefined) {
      if (
        typeof updates.supportPhone !== "string" ||
        !updates.supportPhone.trim() ||
        updates.supportPhone.trim().length > 30
      ) {
        return res.status(400).json({
          message: "A valid support phone number is required.",
        });
      }

      updates.supportPhone = updates.supportPhone.trim();
    }

    // Support email validation.
    if (updates.supportEmail !== undefined) {
      if (
        typeof updates.supportEmail !== "string" ||
        (
          updates.supportEmail.trim() &&
          !isValidEmail(updates.supportEmail.trim())
        )
      ) {
        return res.status(400).json({
          message: "Please provide a valid support email.",
        });
      }

      updates.supportEmail = updates.supportEmail.trim().toLowerCase();
    }

    // Public address validation.
    if (updates.publicAddress !== undefined) {
      if (
        typeof updates.publicAddress !== "string" &&
        !isPlainObject(updates.publicAddress)
      ) {
        return res.status(400).json({
          message: "Public address must be text or an address object.",
        });
      }
    }

    // Support hours validation.
    if (updates.supportHours !== undefined) {
      if (
        typeof updates.supportHours !== "string" &&
        !isPlainObject(updates.supportHours)
      ) {
        return res.status(400).json({
          message: "Support hours must be text or an object.",
        });
      }
    }

    // Store defaults validation.
    if (updates.defaults !== undefined) {
      if (!isPlainObject(updates.defaults)) {
        return res.status(400).json({
          message: "Store defaults must be an object.",
        });
      }

      const allowedDefaults = [
        "dispatchTime",
        "returnPolicy",
        "warrantyPolicy",
        "vacationMode",
      ];

      const safeDefaults = {};

      for (const field of allowedDefaults) {
        if (
          Object.prototype.hasOwnProperty.call(
            updates.defaults,
            field
          )
        ) {
          safeDefaults[field] = updates.defaults[field];
        }
      }

      if (Object.keys(safeDefaults).length === 0) {
        return res.status(400).json({
          message: "No valid store default fields provided.",
        });
      }

      updates.defaults = {
        ...(seller.defaults?.toObject?.() || seller.defaults || {}),
        ...safeDefaults,
      };
    }

    // Apply the validated updates.
    Object.assign(seller, updates);

    // Maintain compatibility with older frontend fields.
    if (updates.about !== undefined) {
      seller.storeDescription = updates.about;
    }

    if (updates.supportPhone !== undefined) {
      seller.storePhone = updates.supportPhone;
    }

    if (updates.publicAddress !== undefined) {
      seller.storeAddress =
        typeof updates.publicAddress === "string"
          ? updates.publicAddress
          : JSON.stringify(updates.publicAddress);
    }

    await seller.save();

    const updatedSeller = await User.findById(seller._id)
      .select(PUBLIC_SELLER_FIELDS);

    return res.status(200).json({
      message: "Store profile updated successfully.",
      seller: updatedSeller,
    });
  } catch (error) {
    console.error("Update seller profile error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "This store name or slug is already in use.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return sendServerError(
      res,
      "Failed to update seller profile."
    );
  }
};

// ======================================================
// APPLY TO BECOME A SELLER
// ======================================================

const applyToBecomeSeller = async (req, res) => {
  try {
    const {
      storeName,
      storeDescription,
      storePhone,
      storeAddress,
      reason,
    } = req.body;

    if (
      typeof storeName !== "string" ||
      !storeName.trim() ||
      typeof storePhone !== "string" ||
      !storePhone.trim() ||
      typeof storeAddress !== "string" ||
      !storeAddress.trim() ||
      typeof reason !== "string" ||
      !reason.trim()
    ) {
      return res.status(400).json({
        message:
          "Store name, phone, address, and application reason are required.",
      });
    }

    if (
      storeName.trim().length < 3 ||
      storeName.trim().length > 50
    ) {
      return res.status(400).json({
        message: "Store name must be between 3 and 50 characters.",
      });
    }

    if (
      storeDescription !== undefined &&
      (
        typeof storeDescription !== "string" ||
        storeDescription.trim().length > 1000
      )
    ) {
      return res.status(400).json({
        message: "Store description must be valid text.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (user.role !== "customer") {
      return res.status(403).json({
        message: "Only customer accounts can apply to become sellers.",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before applying.",
      });
    }

    if (user.sellerStatus === "pending") {
      return res.status(409).json({
        message: "You already have a pending seller application.",
      });
    }

    if (user.sellerStatus === "approved") {
      return res.status(409).json({
        message: "Your account is already approved as a seller.",
      });
    }

    if (user.sellerStatus === "suspended") {
      return res.status(403).json({
        message: "Your seller account is suspended.",
      });
    }

    user.storeName = storeName.trim();
    user.storeDescription = storeDescription
      ? storeDescription.trim()
      : "";
    user.storePhone = storePhone.trim();
    user.storeAddress = storeAddress.trim();

    user.sellerStatus = "pending";
    user.verificationStatus = "pending_review";

    user.sellerApplication = {
      reason: reason.trim(),
      submittedAt: new Date(),
      reviewedAt: null,
      reviewNote: "",
    };

    await user.save();

    return res.status(201).json({
      message: "Seller application submitted successfully.",
      sellerStatus: user.sellerStatus,
      verificationStatus: user.verificationStatus,
    });
  } catch (error) {
    console.error("Seller application error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "This store name or slug is already in use.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return sendServerError(
      res,
      "Failed to submit seller application."
    );
  }
};

// ======================================================
// GET SELLER APPLICATION STATUS
// ======================================================

const getSellerApplicationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "role sellerStatus verificationStatus sellerApplication storeName storeDescription storePhone storeAddress"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const application = user.sellerApplication
      ? {
          reason: user.sellerApplication.reason,
          submittedAt: user.sellerApplication.submittedAt,
          reviewedAt: user.sellerApplication.reviewedAt,
          reviewNote: user.sellerApplication.reviewNote,
        }
      : null;

    return res.status(200).json({
      role: user.role,
      sellerStatus: user.sellerStatus || "not_applicable",
      verificationStatus:
        user.verificationStatus || "pending_review",
      application,
      store: {
        storeName: user.storeName || "",
        storeDescription: user.storeDescription || "",
        storePhone: user.storePhone || "",
        storeAddress: user.storeAddress || "",
      },
    });
  } catch (error) {
    console.error("Get seller application status error:", error);

    return sendServerError(
      res,
      "Failed to retrieve application status."
    );
  }
};

// ======================================================
// EXPORT CONTROLLERS
// ======================================================

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  verifyOTP,
  getSellerProfile,
  updateSellerProfile,
  applyToBecomeSeller,
  getSellerApplicationStatus,
};
