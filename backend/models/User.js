const mongoose = require("mongoose");

// ======================================================
// CUSTOMER SUB-SCHEMAS
// ======================================================

const customerAddressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      enum: ["Home", "Office", "Campus / Hostel", "Other"],
      default: "Home",
    },
    recipientName: { type: String, trim: true, maxlength: 80, default: "" },
    recipientPhone: { type: String, trim: true, maxlength: 20, default: "" },
    division: { type: String, trim: true, default: "" },
    district: { type: String, trim: true, default: "" },
    area: { type: String, trim: true, default: "" },
    streetAddress: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    postalCode: { type: String, trim: true, default: "" },
    isDefaultShipping: { type: Boolean, default: false },
    isDefaultBilling: { type: Boolean, default: false },
  },
  { timestamps: false }
);

const customerWishlistSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantSku: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const customerPriceAlertSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantSku: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    targetPrice: { type: Number, min: 0, required: true },
    notifyOnRestock: { type: Boolean, default: true },
  },
  { _id: false }
);

const ownedDeviceSchema = new mongoose.Schema(
  {
    brand: { type: String, trim: true, maxlength: 80, default: "" },
    model: { type: String, trim: true, maxlength: 100, default: "" },
    category: { type: String, trim: true, maxlength: 80, default: "" },
  },
  { _id: false }
);

const customerPreferencesSchema = new mongoose.Schema(
  {
    orderUpdatesSms: {
      type: Boolean,
      default: true,
    },

    priceDropEmails: {
      type: Boolean,
      default: true,
    },

    restockEmails: {
      type: Boolean,
      default: true,
    },

    warrantyExpiryReminders: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const customerBillingProfileSchema = new mongoose.Schema(
  {
    companyName: { type: String, trim: true, maxlength: 120, default: "" },
    binNumber: { type: String, trim: true, maxlength: 30, default: "" },
  },
  { _id: false }
);

// ======================================================
// EXISTING SELLER SUB-SCHEMAS
// ======================================================

const supportHoursSchema = new mongoose.Schema(
  {
    monday: { type: String, trim: true, default: "Closed" },
    tuesday: { type: String, trim: true, default: "Closed" },
    wednesday: { type: String, trim: true, default: "Closed" },
    thursday: { type: String, trim: true, default: "Closed" },
    friday: { type: String, trim: true, default: "Closed" },
    saturday: { type: String, trim: true, default: "Closed" },
    sunday: { type: String, trim: true, default: "Closed" },
  },
  { _id: false }
);

const dispatchOptions = [
  "Same-Day Dispatch (orders before 3 PM)",
  "1–2 Business Days",
  "3–5 Business Days",
];

const sellerDefaultsSchema = new mongoose.Schema(
  {
    dispatchTime: {
      type: String,
      enum: dispatchOptions,
      default: "1–2 Business Days",
    },
    returnPolicy: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    warrantyPolicy: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    vacationMode: { type: Boolean, default: false },
    vacationMessage: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },
  },
  { _id: false }
);


const sellerMetricsSchema = new mongoose.Schema(
  {
    // Approved customer reviews.
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    // Order fulfilment performance.
    onTimeShipRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    cancellationRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Average time between order placement
    // and seller confirmation.
    avgResponseMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Successfully delivered orders.
    completedOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);


// ======================================================
// SELLER KYC DOCUMENT SCHEMA
// ======================================================

const MAX_KYC_DOCUMENT_SIZE = 5 * 1024 * 1024;

const kycDocumentSchema = new mongoose.Schema(
  {
    storageKey: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    originalName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 255,
    },

    mimeType: {
      type: String,
      enum: ["", "image/jpeg", "image/png", "application/pdf"],
      default: "",
    },

    sizeBytes: {
      type: Number,
      min: 0,
      max: MAX_KYC_DOCUMENT_SIZE,
      default: 0,
    },

    uploadedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

// ======================================================
// SELLER WAREHOUSE ADDRESS SCHEMA
// ======================================================

const sellerWarehouseAddressSchema = new mongoose.Schema(
  {
    street: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
      select: false,
    },

    city: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
      select: false,
    },

    district: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
      select: false,
    },

    postalCode: {
      type: String,
      trim: true,
      default: "",
      maxlength: 20,
      select: false,
    },

    contactPerson: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
      select: false,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 20,
      select: false,
    },
  },
  { _id: false }
);

// ======================================================
// SELLER KYC SCHEMA
// ======================================================

const sellerKycSchema = new mongoose.Schema(
  {
    // Business classification.
    businessType: {
      type: String,
      enum: ["individual", "retail_shop", "company"],
      default: "individual",
      select: false,
    },

    // Requested seller tier.
    // The actual sellerType remains admin-controlled.
    requestedSellerType: {
      type: String,
      enum: [
        "standard_seller",
        "official_brand",
        "authorized_reseller",
        "verified_shop",
        "individual_seller",
      ],
      default: "standard_seller",
      select: false,
    },

    // Account owner information.
    ownerName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
      select: false,
    },

    ownerPhone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: "",
      select: false,
    },

    ownerPhoneVerified: {
      type: Boolean,
      default: false,
      select: false,
    },

    nidNumber: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    // New identity document structure.
    // Front and back are stored separately.
    nidDocuments: {
      front: {
        type: kycDocumentSchema,
        default: () => ({}),
      },

      back: {
        type: kycDocumentSchema,
        default: () => ({}),
      },
    },

    // Legacy fields retained for existing records.
    // New uploads should use nidDocuments.front and nidDocuments.back.
    nidFrontUrl: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    nidBackUrl: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    // Business information.
    legalBusinessName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 160,
      select: false,
    },

    tradeLicenseNumber: {
      type: String,
      trim: true,
      default: "",
      maxlength: 80,
      select: false,
    },

    tradeLicenseDocument: {
      type: kycDocumentSchema,
      default: () => ({}),
    },

    // Legacy URL retained for existing records and integrations.
    tradeLicenseUrl: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    // Optional tax information.
    tinNumber: {
      type: String,
      trim: true,
      default: "",
      maxlength: 30,
      select: false,
    },

    binNumber: {
      type: String,
      trim: true,
      default: "",
      maxlength: 30,
      select: false,
    },

    // Brand authorization documentation.
    authorizationDocument: {
      type: kycDocumentSchema,
      default: () => ({}),
    },

    // Legacy URL retained for existing records and integrations.
    authorizationDocUrl: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    // Deprecated nested path retained temporarily
    // for existing seller records.
    warehouseAddress: {
      type: sellerWarehouseAddressSchema,
      default: () => ({}),
      select: false,
    },

    // KYC submission timestamp.
    submittedAt: {
      type: Date,
      default: null,
      select: false,
    },
  },
  { _id: false }
);

// ======================================================
// SELLER PAYOUT SCHEMA
// ======================================================

const sellerPayoutSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["bank_transfer", "mfs", ""],
      default: "",
      select: false,
    },

    bankName: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    branchName: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    routingNumber: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    accountHolderName: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    accountNumber: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    mfsProvider: {
      type: String,
      enum: ["bKash", "Nagad", "Rocket", ""],
      default: "",
      select: false,
    },

    mfsAccountType: {
      type: String,
      enum: ["Merchant", "Personal", ""],
      default: "",
      select: false,
    },

    mfsNumber: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },
  },
  { _id: false }
);

// ======================================================
// SELLER KYC PHONE OTP SCHEMA
// ======================================================

const sellerKycPhoneOtpSchema = new mongoose.Schema(
  {
    // Only a hashed OTP should be stored.
    otpHash: {
      type: String,
      default: undefined,
      select: false,
    },

    otpExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    otpAttempts: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },

    otpLastSentAt: {
      type: Date,
      default: null,
      select: false,
    },

    otpSendCount: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },

    otpSendWindowStart: {
      type: Date,
      default: null,
      select: false,
    },
  },
  { _id: false }
);

// ======================================================
// MAIN USER SCHEMA
// ======================================================

const userSchema = new mongoose.Schema(
  {
    // Existing authentication fields.
    // Keep these names for compatibility with existing auth code.

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      index: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["customer", "seller", "admin"],
      default: "customer",
      required: true,
      index: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    otp: {
      type: String,
      select: false,
    },

    otpExpires: {
      type: Date,
      select: false,
    },

    otpAttempts: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },

    otpLastSentAt: {
      type: Date,
      default: null,
      select: false,
    },

    otpSendCount: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },

    otpSendWindowStart: {
      type: Date,
      default: null,
      select: false,
    },

    address: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    // ==================================================
    // CUSTOMER ACCOUNT INFORMATION
    // ==================================================

    phone: {
      type: String,
      trim: true,
      default: undefined,
      maxlength: 20,
      unique: true,
      sparse: true,
    },

    googleId: {
      type: String,
      trim: true,
      default: undefined,
      unique: true,
      sparse: true,
      select: false,
    },

    status: {
      type: String,
      enum: ["active", "suspended", "deactivated"],
      default: "active",
      index: true,
    },

    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    avatarUrl: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2048,
    },

    // ==================================================
    // CUSTOMER ADDRESSES
    // ==================================================

    addresses: {
      type: [customerAddressSchema],
      default: [],
      validate: {
        validator: (items) => items.length <= 5,
        message: "A customer can save a maximum of 5 addresses.",
      },
    },

    // ==================================================
    // CUSTOMER SHOPPING FEATURES
    // ==================================================

    wishlist: {
      type: [customerWishlistSchema],
      default: [],
    },

    priceAlerts: {
      type: [customerPriceAlertSchema],
      default: [],
    },

    ownedDevices: {
      type: [ownedDeviceSchema],
      default: [],
    },

    recentlyViewed: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
      ],
      default: [],
      validate: {
        validator: (items) => items.length <= 12,
        message: "Recently viewed can contain at most 12 products.",
      },
    },

    // ==================================================
    // CUSTOMER BILLING AND PREFERENCES
    // ==================================================

    billingProfile: {
      type: customerBillingProfileSchema,
      default: () => ({}),
    },

    preferences: {
      type: customerPreferencesSchema,
      default: () => ({}),
    },

    // Do not merge this with Seller metrics.
    customerMetrics: {
      deliveredOrders: { type: Number, default: 0, min: 0 },
      refusedCodOrders: { type: Number, default: 0, min: 0 },
      totalSpent: { type: Number, default: 0, min: 0 },
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    // ==================================================
    // EXISTING SELLER ACCOUNT STATUS
    // ==================================================

    sellerStatus: {
      type: String,
      enum: [
        "not_applicable",
        "pending",
        "approved",
        "rejected",
        "suspended",
      ],
      default: "not_applicable",
      index: true,
    },

    verificationStatus: {
      type: String,
      enum: [
        "not_submitted",
        "pending_review",
        "approved",
        "rejected",
        "suspended",
      ],
      default: "not_submitted",
      index: true,
    },

    adminReviewNote: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
      select: false,
    },

    // ==================================================
    // EXISTING SELLER STOREFRONT
    // ==================================================

    storeName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 50,
    },

    storeSlug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },

    logoUrl: { type: String, trim: true, default: "" },
    bannerUrl: { type: String, trim: true, default: "" },

    tagline: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    about: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    storeDescription: {
      type: String,
      trim: true,
      default: "",
    },

    // This field remains admin-controlled.
    sellerType: {
      type: String,
      enum: [
        "standard_seller",
        "official_brand",
        "authorized_reseller",
        "verified_shop",
        "individual_seller",
      ],
      default: "standard_seller",
    },

    specialties: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 50,
        },
      ],
      default: [],
      validate: {
        validator: (items) => items.length <= 5,
        message: "A seller can have a maximum of 5 specialties.",
      },
    },

    publicAddress: {
      street: { type: String, trim: true, default: "" },
      area: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      district: { type: String, trim: true, default: "" },
      postalCode: { type: String, trim: true, default: "" },
      country: { type: String, trim: true, default: "Bangladesh" },
    },

    supportHours: {
      type: supportHoursSchema,
      default: () => ({}),
    },

    supportPhone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 20,
    },

    supportEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      maxlength: 254,
    },

    // Legacy Seller contact fields.
    storePhone: { type: String, trim: true, default: "" },
    storeAddress: { type: String, trim: true, default: "" },

    // ==================================================
    // SELLER PRIVATE KYC AND PAYOUT
    // ==================================================

    // Private warehouse/pickup address.
    // Never include this in public seller responses.
    warehouseAddress: {
      type: sellerWarehouseAddressSchema,
      default: () => ({}),
      select: false,
    },

    // Private KYC data.
    // Explicitly select only what an authorized operation needs.
    kyc: {
      type: sellerKycSchema,
      default: () => ({}),
      select: false,
    },

    // Keep phone OTP secrets separate from the KYC payload.
    sellerKycPhoneOtp: {
      type: sellerKycPhoneOtpSchema,
      default: () => ({}),
      select: false,
    },

    payout: {
      type: sellerPayoutSchema,
      default: () => ({}),
      select: false,
    },

    commissionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      select: false,
    },

    // ==================================================
    // EXISTING SELLER DEFAULTS AND METRICS
    // ==================================================

    defaults: {
      type: sellerDefaultsSchema,
      default: () => ({}),
    },

    metrics: {
      type: sellerMetricsSchema,
      default: () => ({}),
    },

    // ==================================================
    // EXISTING SELLER APPLICATION
    // ==================================================

    sellerApplication: {
      reason: {
        type: String,
        trim: true,
        default: "",
        maxlength: 1000,
      },

      submittedAt: {
        type: Date,
        default: null,
      },

      reviewedAt: {
        type: Date,
        default: null,
      },

      reviewNote: {
        type: String,
        trim: true,
        default: "",
        maxlength: 1000,
        select: false,
      },
    },
  },
  {
    timestamps: true,
    minimize: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ======================================================
// COMPATIBILITY VIRTUALS
// ======================================================

// The existing application uses name/isVerified.
// These aliases expose the requested customer terminology.

userSchema.virtual("fullName")
  .get(function () {
    return this.name;
  })
  .set(function (value) {
    this.name = value;
  });

userSchema.virtual("isEmailVerified")
  .get(function () {
    return this.isVerified;
  })
  .set(function (value) {
    this.isVerified = value;
  });

// ======================================================
// VALIDATION AND SELLER FIELD SYNCHRONIZATION
// ======================================================

userSchema.pre("validate", function () {
  if (this.email) {
    this.email = this.email.trim().toLowerCase();
  }

  // Changing the KYC owner phone invalidates any previous OTP verification.
  if (this.isModified("kyc.ownerPhone")) {
    this.set("kyc.ownerPhoneVerified", false);
    this.set("sellerKycPhoneOtp.otpHash", undefined);
    this.set("sellerKycPhoneOtp.otpExpiresAt", null);
    this.set("sellerKycPhoneOtp.otpAttempts", 0);
  }

  // Backward compatibility:
  // Copy the old nested warehouse address to the new canonical
  // User.warehouseAddress path when legacy data is loaded.
  const legacyWarehouse = this.kyc?.warehouseAddress;
  const currentWarehouse = this.warehouseAddress;

  const hasAddressValues = (value) =>
    value &&
    [
      "street",
      "city",
      "district",
      "postalCode",
      "contactPerson",
      "phone",
    ].some((key) => String(value[key] || "").trim());

  if (
    !hasAddressValues(currentWarehouse) &&
    hasAddressValues(legacyWarehouse)
  ) {
    const legacyValue =
      typeof legacyWarehouse.toObject === "function"
        ? legacyWarehouse.toObject()
        : legacyWarehouse;

    this.warehouseAddress = {
      street: legacyValue.street || "",
      city: legacyValue.city || "",
      district: legacyValue.district || "",
      postalCode: legacyValue.postalCode || "",
      contactPerson: legacyValue.contactPerson || "",
      phone: legacyValue.phone || "",
    };
  }

  // ==================================================
  // CUSTOMER ADDRESS VALIDATION
  // ==================================================

  if (Array.isArray(this.addresses)) {
    if (this.addresses.length > 5) {
      this.invalidate(
        "addresses",
        "A maximum of 5 saved addresses is allowed."
      );
    }

    const defaultShippingCount = this.addresses.filter(
      (item) => item.isDefaultShipping
    ).length;

    const defaultBillingCount = this.addresses.filter(
      (item) => item.isDefaultBilling
    ).length;

    if (defaultShippingCount > 1) {
      this.invalidate(
        "addresses",
        "Only one default shipping address is allowed."
      );
    }

    if (defaultBillingCount > 1) {
      this.invalidate(
        "addresses",
        "Only one default billing address is allowed."
      );
    }
  }

  if (this.recentlyViewed?.length > 12) {
    this.recentlyViewed = this.recentlyViewed.slice(-12);
  }

  // ==================================================
  // PRESERVE EXISTING SELLER COMPATIBILITY BEHAVIOR
  // ==================================================

  if (!this.storeDescription && this.about) {
    this.storeDescription = this.about;
  }

  if (!this.about && this.storeDescription) {
    this.about = this.storeDescription;
  }

  if (!this.supportPhone && this.storePhone) {
    this.supportPhone = this.storePhone;
  }

  if (!this.storePhone && this.supportPhone) {
    this.storePhone = this.supportPhone;
  }

  if (!this.storeAddress && this.publicAddress) {
    const addressParts = [
      this.publicAddress.street,
      this.publicAddress.area,
      this.publicAddress.city,
      this.publicAddress.district,
    ].filter(Boolean);

    this.storeAddress = addressParts.join(", ");
  }

  // ==================================================
  // STORE SLUG GENERATION
  // ==================================================

  if (
    this.storeName &&
    (this.isNew || this.isModified("storeName") || !this.storeSlug)
  ) {
    this.storeSlug = this.storeName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // ==================================================
  // EXISTING SELLER VALIDATIONS
  // ==================================================

  if (this.role === "seller" && this.storeName) {
    if (this.storeName.length < 3 || this.storeName.length > 50) {
      this.invalidate(
        "storeName",
        "Store name must contain 3–50 characters."
      );
    }
  }

  if (this.supportEmail) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(this.supportEmail)) {
      this.invalidate(
        "supportEmail",
        "Please provide a valid seller support email."
      );
    }
  }

  if (this.specialties && this.specialties.length > 5) {
    this.invalidate(
      "specialties",
      "A maximum of 5 specialties is allowed."
    );
  }

  if (
    this.sellerType === "verified_shop" ||
    this.sellerType === "authorized_reseller"
  ) {
    const address = this.publicAddress || {};

    if (!address.city && !address.district && !address.street) {
      this.invalidate(
        "publicAddress",
        "A public business address is required for this seller type."
      );
    }
  }

  // ==================================================
  // NID / PASSPORT VALIDATION
  // ==================================================

  if (this.isModified("kyc.nidNumber") && this.kyc?.nidNumber) {
    const nid = this.kyc.nidNumber.trim();

    const validNid = /^(\d{10}|\d{13}|\d{17})$/.test(nid);
    const validPassport = /^[A-Za-z0-9]{6,20}$/.test(nid);

    if (!validNid && !validPassport) {
      this.invalidate(
        "kyc.nidNumber",
        "Provide a valid 10, 13, or 17 digit NID or passport number."
      );
    }
  }
});

// ======================================================
// INDEXES
// ======================================================

userSchema.index({
  role: 1,
  verificationStatus: 1,
});

userSchema.index({
  role: 1,
  sellerStatus: 1,
});

// ======================================================
// EXPORT
// ======================================================

module.exports =
  mongoose.models.User ||
  mongoose.model("User", userSchema);