
const mongoose = require("mongoose");

const productCompatibilitySchema = require(
  "./ProductCompatibility"
);

// ======================================================
// HELPERS
// ======================================================

const createSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const isValidUrl = (value) => {
  if (!value) return true;

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

// ======================================================
// PRODUCT IMAGE SCHEMA
// ======================================================

const productImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isValidUrl,
        message: "Please provide a valid image URL.",
      },
    },

    slot: {
      type: String,
      enum: ["main", "ports", "packaging", "scale", "extra"],
      required: true,
      default: "extra",
    },

    variantValue: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);

// ======================================================
// PRODUCT VARIANT SCHEMA
// ======================================================

const variantSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
    },

    attributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    regularPrice: {
      type: Number,
      required: true,
      min: 0.01,
    },

    salePrice: {
      type: Number,
      min: 0.01,
      default: null,
    },

    stockQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Stock quantity must be a whole number.",
      },
    },

    lowStockThreshold: {
      type: Number,
      min: 0,
      default: 3,
      validate: {
        validator: Number.isInteger,
        message: "Low stock threshold must be a whole number.",
      },
    },

    maxOrderQuantity: {
      type: Number,
      min: 1,
      default: null,
      validate: {
        validator: (value) =>
          value === null ||
          value === undefined ||
          Number.isInteger(value),
        message: "Maximum order quantity must be a whole number.",
      },
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: false }
);

variantSchema.pre("validate", function () {
  if (this.sku) {
    this.sku = this.sku.trim().toUpperCase();
  }

  if (
    this.salePrice !== null &&
    this.salePrice !== undefined &&
    this.regularPrice !== undefined &&
    this.salePrice >= this.regularPrice
  ) {
    this.invalidate(
      "salePrice",
      "Sale price must be lower than regular price."
    );
  }

  if (
    this.maxOrderQuantity !== null &&
    this.maxOrderQuantity !== undefined &&
    this.stockQuantity !== undefined &&
    this.maxOrderQuantity < 1
  ) {
    this.invalidate(
      "maxOrderQuantity",
      "Maximum order quantity must be at least 1."
    );
  }
});

// ======================================================
// TECHNICAL SPECIFICATION SCHEMA
// ======================================================

const specificationSchema = new mongoose.Schema(
  {
    group: {
      type: String,
      required: true,
      trim: true,
    },

    key: {
      type: String,
      required: true,
      trim: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
    },

    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false }
);

// ======================================================
// BOX CONTENTS SCHEMA
// ======================================================

const boxContentSchema = new mongoose.Schema(
  {
    qty: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be a whole number.",
      },
    },

    item: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

// ======================================================
// VARIANT OPTION SCHEMA
// ======================================================

const variantOptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    values: {
      type: [String],
      default: [],
      validate: {
        validator: (values) =>
          Array.isArray(values) &&
          values.length > 0 &&
          values.every(
            (value) =>
              typeof value === "string" &&
              value.trim().length > 0
          ),
        message:
          "Each variant option must have at least one valid value.",
      },
    },
  },
  { _id: false }
);

// ======================================================
// MAIN PRODUCT SCHEMA
// ======================================================

const productSchema = new mongoose.Schema(
  {
    // --------------------------------------------------
    // PRODUCT IDENTITY
    // --------------------------------------------------

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 120,
    },

    slug: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
    },

    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },

    mpn: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 100,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    tags: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 25,
        },
      ],
      default: [],
      validate: {
        validator: (tags) =>
          Array.isArray(tags) && tags.length <= 8,
        message: "A product can have a maximum of 8 tags.",
      },
    },

    // --------------------------------------------------
    // AUTHENTICITY AND CONDITION
    // --------------------------------------------------

    condition: {
      type: String,
      enum: [
        "new_sealed",
        "open_box",
        "manufacturer_refurbished",
        "seller_refurbished",
        "used_grade_a",
        "used_grade_b",
      ],
      default: "new_sealed",
    },

    conditionNotes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    regionVariant: {
      type: String,
      enum: [
        "Official Local Variant (BD)",
        "Global / International",
        "US Variant",
        "UK / EU Variant",
        "CN (China ROM)",
        "Japan Variant",
      ],
      default: "Official Local Variant (BD)",
    },

    gtin: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: (value) =>
          !value || /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value),
        message: "GTIN must contain 8, 12, 13, or 14 digits.",
      },
    },

    verificationProof: {
      type: String,
      select: false,
      default: "",
    },

    // --------------------------------------------------
    // ADMIN MODERATION
    // --------------------------------------------------

    moderationStatus: {
      type: String,
      enum: [
        "pending_review",
        "approved",
        "rejected",
        "suspended",
      ],
      default: "approved",
      index: true,
    },

    moderationNote: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
      select: false,
    },

    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    moderatedAt: {
      type: Date,
      default: null,
    },

    isGenuineVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    genuineVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    genuineVerifiedAt: {
      type: Date,
      default: null,
    },

    // --------------------------------------------------
    // PRODUCT IMAGES AND VIDEO
    // --------------------------------------------------

    images: {
      type: [productImageSchema],
      default: [],
      validate: {
        validator: (images) => {
          if (!Array.isArray(images) || images.length > 10) {
            return false;
          }

          const mainCount = images.filter(
            (image) => image.slot === "main"
          ).length;

          const portsCount = images.filter(
            (image) => image.slot === "ports"
          ).length;

          return mainCount === 1 && portsCount === 1;
        },
        message:
          "A product must have exactly one main image and one ports image. Maximum 10 images allowed.",
      },
    },

    videoUrl: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: isValidUrl,
        message: "Please provide a valid video URL.",
      },
    },

    // --------------------------------------------------
    // PRODUCT DESCRIPTION
    // --------------------------------------------------

    highlights: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 100,
        },
      ],
      default: [],
      validate: {
        validator: (items) =>
          Array.isArray(items) &&
          items.length >= 3 &&
          items.length <= 5 &&
          items.every((item) => item.length > 0),
        message:
          "A product must have between 3 and 5 valid highlights.",
      },
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 100,
    },

    // --------------------------------------------------
    // CUSTOMER RATING SUMMARY
    // Maintained from approved Review documents only.
    // Never accept these values directly from customers.
    // --------------------------------------------------

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    boxContents: {
      type: [boxContentSchema],
      default: [],
    },

    plugType: {
      type: String,
      enum: [
        "",
        "US 2-Pin (Type A/B)",
        "UK 3-Pin (Type G)",
        "EU 2-Pin (Type C/F)",
        "Universal / USB-Powered",
      ],
      default: "",
    },

    includesAdapter: {
      type: Boolean,
      default: false,
    },

    // --------------------------------------------------
    // VARIANTS AND INVENTORY
    // --------------------------------------------------

    hasVariants: {
      type: Boolean,
      default: false,
    },

    variantOptions: {
      type: [variantOptionSchema],
      default: [],
      validate: {
        validator: (items) =>
          Array.isArray(items) && items.length <= 2,
        message: "A maximum of 2 variant axes is allowed.",
      },
    },

    variants: {
      type: [variantSchema],
      default: [],
      validate: {
        validator: (variants) =>
          Array.isArray(variants) && variants.length >= 1,
        message: "A product must have at least one variant.",
      },
    },

    // --------------------------------------------------
    // WARRANTY AND RETURNS
    // --------------------------------------------------

    warrantyType: {
      type: String,
      enum: [
        "Official Brand Warranty",
        "Seller / Shop Service Warranty",
        "Instant Replacement Only",
        "International Warranty",
        "No Warranty",
      ],
      default: "No Warranty",
    },

    warrantyDuration: {
      value: {
        type: Number,
        min: 1,
        default: null,
      },

      unit: {
        type: String,
        enum: ["Days", "Months", "Years", "Lifetime"],
        default: "Months",
      },
    },

    warrantyPolicy: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    returnPolicy: {
      type: String,
      enum: [
        "7-Day Easy Return (Unopened/Defective)",
        "3-Day DOA (Dead on Arrival) Replacement",
        "Non-Returnable",
      ],
      default: "Non-Returnable",
    },

    // --------------------------------------------------
    // SHIPPING
    // --------------------------------------------------

    shipping: {
      weightGrams: {
        type: Number,
        min: 0,
        default: null,
      },

      dimensions: {
        lengthCm: {
          type: Number,
          min: 0,
          default: null,
        },

        widthCm: {
          type: Number,
          min: 0,
          default: null,
        },

        heightCm: {
          type: Number,
          min: 0,
          default: null,
        },
      },
    },

    dispatchTime: {
      type: String,
      enum: [
        "Same-Day Dispatch (Orders before 3 PM)",
        "1–2 Business Days",
        "3–5 Business Days",
        "Pre-Order",
      ],
      default: "1–2 Business Days",
    },

    preorderReleaseDate: {
      type: Date,
      default: null,
    },

    // --------------------------------------------------
    // TECHNICAL SPECIFICATIONS
    // --------------------------------------------------

    specifications: {
      type: [specificationSchema],
      default: [],
    },

    // --------------------------------------------------
    // DEVICE COMPATIBILITY
    // --------------------------------------------------

    compatibility: {
      type: productCompatibilitySchema,
      default: () => ({
        mode: "not_applicable",
        devices: [],
        notes: "",
      }),
    },

    // --------------------------------------------------
    // SELLER REFERENCES
    // --------------------------------------------------

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Legacy seller reference retained during migration.
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // --------------------------------------------------
    // LEGACY FRONTEND COMPATIBILITY
    // Remove after frontend migration is complete.
    // --------------------------------------------------

    name: {
      type: String,
      trim: true,
      default: "",
    },

    price: {
      type: Number,
      min: 0,
      default: null,
    },

    image: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// ======================================================
// PRODUCT VALIDATION AND SYNCHRONIZATION
// ======================================================

productSchema.pre("validate", function () {
  // Synchronize legacy name and new title.
  if (!this.title && this.name) {
    this.title = this.name;
  }

  if (!this.name && this.title) {
    this.name = this.title;
  }

  // Normalize MPN.
  if (this.mpn) {
    this.mpn = this.mpn.trim().toUpperCase();
  }

  // Generate slug only when one does not already exist.
  // Existing slugs remain stable.
  if (!this.slug && this.title) {
    this.slug = createSlug(
      `${this.title}-${this.mpn || this._id}`
    );
  } else if (this.slug) {
    this.slug = createSlug(this.slug);
  }

  // Synchronize legacy image field.
  if (this.images && this.images.length > 0) {
    const mainImage = this.images.find(
      (item) => item.slot === "main"
    );

    if (mainImage) {
      this.image = mainImage.url;
    }
  }

  // Legacy price conversion.
  if (
    this.variants.length === 0 &&
    this.price !== null &&
    this.price !== undefined
  ) {
    this.variants.push({
      sku: `LEGACY-${this._id}`,
      attributes: {},
      regularPrice: this.price,
      stockQuantity: 0,
      lowStockThreshold: 3,
      isDefault: true,
    });
  }

  // Variant validation and synchronization.
  if (this.variants.length > 0) {
    const defaultVariants = this.variants.filter(
      (variant) => variant.isDefault
    );

    // Automatically select the only variant as default.
    if (
      this.variants.length === 1 &&
      defaultVariants.length === 0
    ) {
      this.variants[0].isDefault = true;
    }

    // Multiple variants require exactly one default.
    if (
      this.variants.length > 1 &&
      defaultVariants.length !== 1
    ) {
      this.invalidate(
        "variants",
        "A product with multiple variants must have exactly one default variant."
      );
    }

    // Prevent duplicate SKUs within the same product.
    const skus = this.variants.map(
      (variant) => variant.sku?.trim().toUpperCase()
    );

    if (new Set(skus).size !== skus.length) {
      this.invalidate(
        "variants",
        "Variant SKUs must be unique within the same product."
      );
    }

    // Synchronize legacy price from default variant.
    const defaultVariant = this.variants.find(
      (variant) => variant.isDefault
    );

    if (defaultVariant) {
      this.price =
        defaultVariant.salePrice ?? defaultVariant.regularPrice;
    }
  }

  // hasVariants must match the actual variant structure.
  if (this.hasVariants && this.variants.length < 2) {
    this.invalidate(
      "hasVariants",
      "A product with variants must contain at least two variants."
    );
  }

  if (!this.hasVariants && this.variants.length > 1) {
    this.invalidate(
      "hasVariants",
      "A product without variants can contain only one variant."
    );
  }

  // Variant options should match the hasVariants setting.
  if (
    this.hasVariants &&
    this.variantOptions.length === 0
  ) {
    this.invalidate(
      "variantOptions",
      "Variant options are required when a product has variants."
    );
  }

  // Condition notes are required for non-sealed products.
  if (
    this.condition !== "new_sealed" &&
    !this.conditionNotes?.trim()
  ) {
    this.invalidate(
      "conditionNotes",
      "Condition notes are required for this product condition."
    );
  }

  // Warranty duration is required when warranty is offered.
  if (
    this.warrantyType !== "No Warranty" &&
    !this.warrantyDuration?.value &&
    this.warrantyDuration?.unit !== "Lifetime"
  ) {
    this.invalidate(
      "warrantyDuration.value",
      "Warranty duration is required when a warranty is offered."
    );
  }

  // Pre-order products require a release date.
  if (
    this.dispatchTime === "Pre-Order" &&
    !this.preorderReleaseDate
  ) {
    this.invalidate(
      "preorderReleaseDate",
      "A release date is required for pre-order products."
    );
  }

  // A non-preorder product should not retain a preorder date.
  if (
    this.dispatchTime !== "Pre-Order" &&
    this.preorderReleaseDate
  ) {
    this.preorderReleaseDate = null;
  }

  // Synchronize seller references during migration.
  if (!this.sellerId && this.seller) {
    this.sellerId = this.seller;
  }

  if (!this.seller && this.sellerId) {
    this.seller = this.sellerId;
  }
});

// ======================================================
// INDEXES
// ======================================================

productSchema.index({
  title: "text",
  tags: "text",
});

productSchema.index({
  categoryId: 1,
  createdAt: -1,
});

productSchema.index({
  brandId: 1,
});

productSchema.index({
  sellerId: 1,
});

productSchema.index({
  "variants.sku": 1,
});

productSchema.index({
  moderationStatus: 1,
  createdAt: -1,
});

// Device compatibility indexes.
productSchema.index({
  "compatibility.devices.deviceId": 1,
});

productSchema.index({
  "compatibility.mode": 1,
});

// Product rating and review sorting.
productSchema.index({
  averageRating: -1,
  reviewCount: -1,
});

// ======================================================
// EXPORT MODEL
// ======================================================

module.exports =
  mongoose.models.Product ||
  mongoose.model("Product", productSchema);
