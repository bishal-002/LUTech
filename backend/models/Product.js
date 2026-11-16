
const mongoose = require("mongoose");

// ---------------------------------------------
// Helper: Generate URL-friendly slugs
// ---------------------------------------------
function createSlug(value) {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------
// Product image schema
// ---------------------------------------------
const productImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },

    slot: {
      type: String,
      enum: ["main", "ports", "packaging", "scale", "extra"],
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

// ---------------------------------------------
// Product variant schema
// ---------------------------------------------
const variantSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
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
    },

    lowStockThreshold: {
      type: Number,
      min: 0,
      default: 3,
    },

    maxOrderQuantity: {
      type: Number,
      min: 1,
      default: null,
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
    this.salePrice >= this.regularPrice
  ) {
    this.invalidate(
      "salePrice",
      "Sale price must be lower than regular price."
    );
  }
});

// ---------------------------------------------
// Product technical specification schema
// ---------------------------------------------
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

// ---------------------------------------------
// Product box contents schema
// ---------------------------------------------
const boxContentSchema = new mongoose.Schema(
  {
    qty: {
      type: Number,
      required: true,
      min: 1,
    },

    item: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

// ---------------------------------------------
// Variant option schema
// ---------------------------------------------
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
          Array.isArray(values) && values.length > 0,
        message: "Each variant option must have at least one value.",
      },
    },
  },
  { _id: false }
);

// ---------------------------------------------
// Main product schema
// ---------------------------------------------
const productSchema = new mongoose.Schema(
  {
    // Product identity
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
      default: null,
    },

    mpn: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
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

    // Authenticity and condition
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

    // Product images and video
    images: {
      type: [productImageSchema],
      default: [],
      validate: {
        validator: (images) => {
          if (!Array.isArray(images) || images.length > 10) {
            return false;
          }

          const hasMainImage = images.some(
            (image) => image.slot === "main"
          );

          const hasPortsImage = images.some(
            (image) => image.slot === "ports"
          );

          const mainCount = images.filter(
            (image) => image.slot === "main"
          ).length;

          const portsCount = images.filter(
            (image) => image.slot === "ports"
          ).length;

          return (
            hasMainImage &&
            hasPortsImage &&
            mainCount === 1 &&
            portsCount === 1
          );
        },
        message:
          "A product must have exactly one main image and one ports image. Maximum 10 images allowed.",
      },
    },

    videoUrl: {
      type: String,
      trim: true,
      default: "",
    },

    // Product description
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
          items.length <= 5,
        message: "A product must have between 3 and 5 highlights.",
      },
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 100,
    },

    boxContents: {
      type: [boxContentSchema],
      default: [],
    },

    plugType: {
      type: String,
      enum: [
        "US 2-Pin (Type A/B)",
        "UK 3-Pin (Type G)",
        "EU 2-Pin (Type C/F)",
        "Universal / USB-Powered",
        "",
      ],
      default: "",
    },

    includesAdapter: {
      type: Boolean,
      default: false,
    },

    // Variants and inventory
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

    // Warranty and returns
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

    // Shipping
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

    // Technical specifications
    specifications: {
      type: [specificationSchema],
      default: [],
    },

    // Seller references
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Legacy compatibility fields
    // Remove only after frontend and controllers are migrated.
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

// ---------------------------------------------
// Product-level validation and synchronization
// ---------------------------------------------
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

  // Generate slug.
  if (!this.slug && this.title) {
    this.slug = createSlug(
      `${this.title}-${this.mpn || this._id}`
    );
  } else if (this.slug) {
    this.slug = createSlug(this.slug);
  }

  // Legacy image is retained for backward compatibility.
  // New products must provide the required images array:
  // exactly one main image and exactly one ports image.

  // Synchronize legacy image field.
  if (this.images.length > 0) {
    const mainImage = this.images.find(
      (item) => item.slot === "main"
    );

    if (mainImage) {
      this.image = mainImage.url;
    }
  }

  // Convert old price into a default variant.
  if (this.variants.length === 0 && this.price !== null) {
    this.variants.push({
      sku: `LEGACY-${this._id}`,
      attributes: {},
      regularPrice: this.price,
      stockQuantity: 0,
      lowStockThreshold: 3,
      isDefault: true,
    });
  }

  // Variant consistency checks.
  if (this.variants.length > 0) {
    const defaultVariants = this.variants.filter(
      (variant) => variant.isDefault
    );

    // Automatically select the only variant as default.
    if (this.variants.length === 1 && defaultVariants.length === 0) {
      this.variants[0].isDefault = true;
    }

    if (this.variants.length > 1 && defaultVariants.length !== 1) {
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
        "Variant SKUs must be unique within a product."
      );
    }

    // Synchronize legacy price from the default variant.
    const defaultVariant =
      this.variants.find((variant) => variant.isDefault);

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

  // Warranty duration is required when a warranty is offered.
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

  // Synchronize seller references during the transition.
  if (!this.sellerId && this.seller) {
    this.sellerId = this.seller;
  }

  if (!this.seller && this.sellerId) {
    this.seller = this.sellerId;
  }
});

// ---------------------------------------------
// Indexes
// ---------------------------------------------
productSchema.index({ title: "text", tags: "text" });
productSchema.index({ categoryId: 1, createdAt: -1 });
productSchema.index({ brandId: 1 });
productSchema.index({ sellerId: 1 });
productSchema.index({ "variants.sku": 1 });

// ---------------------------------------------
// Export model
// ---------------------------------------------
module.exports =
  mongoose.models.Product ||
  mongoose.model("Product", productSchema);
