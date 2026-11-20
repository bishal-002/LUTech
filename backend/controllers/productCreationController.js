const Product = require("../models/Product");
const Brand = require("../models/Brand");
const Category = require("../models/Category");

const {
  getPlatformSettings,
} = require("../services/platformSettingsService");

// ======================================================
// ALLOWED PRODUCT FIELDS
// ======================================================

const ALLOWED_PRODUCT_FIELDS = [
  "title",
  "brandId",
  "mpn",
  "categoryId",
  "tags",
  "condition",
  "conditionNotes",
  "regionVariant",
  "gtin",
  "images",
  "videoUrl",
  "highlights",
  "description",
  "boxContents",
  "plugType",
  "includesAdapter",
  "hasVariants",
  "variantOptions",
  "variants",
  "warrantyType",
  "warrantyDuration",
  "warrantyPolicy",
  "returnPolicy",
  "shipping",
  "dispatchTime",
  "preorderReleaseDate",
  "specifications",
];

// ======================================================
// HELPERS
// ======================================================

const getProductData = (body = {}) => {
  const data = {};

  for (const field of ALLOWED_PRODUCT_FIELDS) {
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        field
      )
    ) {
      data[field] = body[field];
    }
  }

  return data;
};

const handleProductError = (res, error) => {
  console.error(
    "Product Creation Controller Error:",
    error
  );

  if (error.name === "ValidationError") {
    return res.status(400).json({
      message: "Product validation failed.",
      errors: Object.values(error.errors).map(
        (item) => item.message
      ),
    });
  }

  if (
    error.name === "CastError" ||
    error.name === "BSONError"
  ) {
    return res.status(400).json({
      message: "Invalid product data or ID.",
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      message:
        "A product with this unique value already exists.",
      field:
        Object.keys(error.keyValue || {})[0] ||
        "unknown",
    });
  }

  return res.status(500).json({
    message: "An unexpected server error occurred.",
  });
};

// ======================================================
// CREATE PRODUCT
// POST /api/products
// ======================================================

const createProduct = async (req, res) => {
  try {
    const user = req.user;

    if (
      !user ||
      !["seller", "admin"].includes(user.role)
    ) {
      return res.status(403).json({
        message:
          "Only sellers and administrators can create products.",
      });
    }

    const productData = getProductData(req.body);

    if (!productData.title) {
      return res.status(400).json({
        message: "Product title is required.",
      });
    }

    if (!productData.brandId) {
      return res.status(400).json({
        message: "Brand is required.",
      });
    }

    if (!productData.categoryId) {
      return res.status(400).json({
        message: "Category is required.",
      });
    }

    // Load platform settings for seller-created products.
    // Administrators retain the existing product-creation behavior.
    let settings = null;

    if (user.role === "seller") {
      settings = await getPlatformSettings();

      const masterBrandIds = (
        settings.masterBrands || []
      ).map((brandId) => brandId.toString());

      if (
        !masterBrandIds.includes(
          String(productData.brandId)
        )
      ) {
        return res.status(400).json({
          message:
            masterBrandIds.length === 0
              ? "No master brands have been configured. Contact the platform administrator."
              : "The selected brand is not available in the approved master-brand registry.",
          code: "MASTER_BRAND_NOT_ALLOWED",
        });
      }
    }

    // Verify the selected brand and category.
    const [brand, category] = await Promise.all([
      Brand.findOne({
        _id: productData.brandId,
        isActive: true,
      }).select("_id"),

      Category.findOne({
        _id: productData.categoryId,
        isActive: true,
      }).select("_id"),
    ]);

    if (!brand) {
      return res.status(400).json({
        message:
          "Selected brand does not exist or is inactive.",
      });
    }

    if (!category) {
      return res.status(400).json({
        message:
          "Selected category does not exist or is inactive.",
      });
    }

    if (!productData.images) {
      return res.status(400).json({
        message: "Product images are required.",
      });
    }

    if (!productData.variants) {
      return res.status(400).json({
        message:
          "At least one product variant is required.",
      });
    }

    // Ownership is always assigned by the backend.
    const sellerId = user._id || user.id;

    if (!sellerId) {
      return res.status(400).json({
        message:
          "Unable to identify the product owner.",
      });
    }

    productData.sellerId = sellerId;
    productData.seller = sellerId;

    // Automatic approval applies only to individual sellers.
    if (
      user.role === "seller" &&
      user.sellerType === "individual_seller"
    ) {
      productData.moderationStatus =
        settings.autoApproveProducts
          ? "approved"
          : "pending_review";
    } else {
      // Preserve the existing behavior for other seller
      // types and administrator-created products.
      productData.moderationStatus = "approved";
    }

    const product = await Product.create(productData);

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      product,
    });
  } catch (error) {
    return handleProductError(res, error);
  }
};

module.exports = {
  createProduct,
};