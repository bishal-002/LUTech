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
    orderUpdatesSms: { type: Boolean, default: true },
    priceDropEmails: { type: Boolean, default: true },
    warrantyExpiryReminders: { type: Boolean, default: true },
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
    reviewCount: { type: Number, default: 0, min: 0 },
    onTimeShipRate: { type: Number, default: 0, min: 0, max: 100 },
    cancellationRate: { type: Number, default: 0, min: 0, max: 100 },
    avgResponseMinutes: { type: Number, default: 0, min: 0 },
    completedOrders: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const sellerKycSchema = new mongoose.Schema(
  {
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
    nidNumber: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },
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
    legalBusinessName: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },
    tradeLicenseNumber: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },
    tradeLicenseUrl: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },
    tinNumber: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },
    binNumber: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },
    authorizationDocUrl: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },
    warehouseAddress: {
      street: { type: String, trim: true, default: "", select: false },
      city: { type: String, trim: true, default: "", select: false },
      district: { type: String, trim: true, default: "", select: false },
      postalCode: { type: String, trim: true, default: "", select: false },
      contactPerson: { type: String, trim: true, default: "", select: false },
      phone: { type: String, trim: true, default: "", select: false },
    },
  },
  { _id: false }
);

const sellerPayoutSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["bank_transfer", "mfs", ""],
      default: "",
      select: false,
    },
    bankName: { type: String, trim: true, default: "", select: false },
    branchName: { type: String, trim: true, default: "", select: false },
    routingNumber: { type: String, trim: true, default: "", select: false },
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
    mfsNumber: { type: String, trim: true, default: "", select: false },
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

    otp: { type: String, select: false },
    otpExpires: { type: Date, select: false },

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
    // EXISTING SELLER PRIVATE KYC AND PAYOUT
    // ==================================================

    kyc: {
      type: sellerKycSchema,
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

  // Customer address validation.
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

  // Preserve existing Seller compatibility behavior.
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

  if (this.isNew && this.storeName && !this.storeSlug) {
    this.storeSlug = this.storeName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // Existing Seller validations.
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