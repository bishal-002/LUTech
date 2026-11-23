const mongoose = require("mongoose");

const Product = require("../models/Product");
const Category = require("../models/Category");

const {
  ProductValidationError,
  isPlainObject,
  normalizeGtin,
  sanitizeProductDescription,
  validateSpecificationTemplate,
  validateCategorySpecifications,
  validateShippingAndWarranty,
  validateProductImages,
  validateVideoUrl,
} = require("../services/productValidationService");

// ======================================================
// COMMON RESPONSE
// ======================================================

const sendValidationError = (res, error) => {
  const errors = error.errors || [error.message];

  return res.status(error.statusCode || 400).json({
    message: error.message,
    errors,
  });
};

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object, key);

// ======================================================
// PRODUCT OWNERSHIP FILTER
// ======================================================

const getProductFilter = (user, id) => {
  if (user?.role === "admin") {
    return { _id: id };
  }

  return {
    _id: id,
    $or: [
      { sellerId: user?._id },
      { seller: user?._id },
    ],
  };
};

// ======================================================
// DEEP MERGE FOR SHIPPING AND WARRANTY
// ======================================================

const mergeShipping = (current, incoming) => {
  if (incoming === null) {
    return null;
  }

  const currentObject = current?.toObject
    ? current.toObject()
    : current || {};

  return {
    ...currentObject,
    ...incoming,
    dimensions: {
      ...(currentObject.dimensions || {}),
      ...(incoming.dimensions || {}),
    },
  };
};

const mergeWarrantyDuration = (current, incoming) => {
  if (incoming === null) {
    return null;
  }

  return {
    ...(current?.toObject ? current.toObject() : current || {}),
    ...incoming,
  };
};

// ======================================================
// VALIDATE PRODUCT CREATE / UPDATE
// ======================================================

const validateProductPayload = async (req, res, next) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({
        message: "A valid JSON object is required.",
      });
    }

    const isUpdate = req.method === "PUT";
    let existingProduct = null;

    if (isUpdate) {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid product ID.",
        });
      }

      existingProduct = await Product.findOne(
        getProductFilter(req.user, req.params.id)
      );

      if (!existingProduct) {
        return res.status(404).json({
          message: "Product not found or access denied.",
        });
      }
    }

    const current = existingProduct
      ? existingProduct.toObject()
      : {};

    const body = req.body;

    const candidate = {
      ...current,
      ...body,
    };

    // ----------------------------------------------
    // NORMALIZE GTIN
    // ----------------------------------------------

    if (hasOwn(body, "gtin")) {
      body.gtin = normalizeGtin(body.gtin);
      candidate.gtin = body.gtin;
    }

    // ----------------------------------------------
    // SANITIZE DESCRIPTION
    // ----------------------------------------------

    if (hasOwn(body, "description")) {
      body.description = sanitizeProductDescription(
        body.description
      );

      candidate.description = body.description;

      if (
        body.description.length < 100 ||
        body.description.length > 5000
      ) {
        throw new ProductValidationError(
          "Product description must contain 100–5,000 characters after sanitization."
        );
      }
    } else if (!isUpdate) {
      throw new ProductValidationError(
        "Product description is required."
      );
    }

    // ----------------------------------------------
    // MERGE PARTIAL SHIPPING UPDATES
    // ----------------------------------------------

    const shippingChanged =
      !isUpdate || hasOwn(body, "shipping");

    if (isUpdate && hasOwn(body, "shipping")) {
      candidate.shipping = mergeShipping(
        current.shipping,
        body.shipping
      );

      body.shipping = candidate.shipping;
    }

    // ----------------------------------------------
    // MERGE PARTIAL WARRANTY UPDATES
    // ----------------------------------------------

    const warrantyChanged =
      !isUpdate ||
      hasOwn(body, "warrantyType") ||
      hasOwn(body, "warrantyDuration") ||
      hasOwn(body, "warrantyPolicy");

    if (isUpdate && hasOwn(body, "warrantyDuration")) {
      candidate.warrantyDuration =
        mergeWarrantyDuration(
          current.warrantyDuration,
          body.warrantyDuration
        );

      body.warrantyDuration =
        candidate.warrantyDuration;
    }

    if (hasOwn(body, "warrantyType")) {
      candidate.warrantyType = body.warrantyType;
    }

    if (hasOwn(body, "warrantyPolicy")) {
      candidate.warrantyPolicy = body.warrantyPolicy;
    }

    // ----------------------------------------------
    // DISPATCH VALIDATION
    // ----------------------------------------------

    const dispatchChanged =
      !isUpdate ||
      hasOwn(body, "dispatchTime") ||
      hasOwn(body, "preorderReleaseDate");

    if (
      hasOwn(body, "dispatchTime") &&
      body.dispatchTime !== "Pre-Order" &&
      !hasOwn(body, "preorderReleaseDate")
    ) {
      body.preorderReleaseDate = null;
      candidate.preorderReleaseDate = null;
    }

    // ----------------------------------------------
    // SHIPPING / WARRANTY / DISPATCH RULES
    // ----------------------------------------------

    const lifecycleErrors =
      validateShippingAndWarranty(candidate, {
        validateShipping: shippingChanged,
        validateWarranty: warrantyChanged,
        validateDispatch: dispatchChanged,
      });

    if (lifecycleErrors.length > 0) {
      throw new ProductValidationError(
        "Shipping, warranty or dispatch validation failed.",
        lifecycleErrors
      );
    }

    // ----------------------------------------------
    // PRODUCT IMAGES
    // ----------------------------------------------

    if (hasOwn(body, "images")) {
      validateProductImages(body.images);
    } else if (!isUpdate) {
      throw new ProductValidationError(
        "Product images are required."
      );
    }

    // ----------------------------------------------
    // PRODUCT VIDEO
    // ----------------------------------------------

    if (hasOwn(body, "videoUrl")) {
      body.videoUrl = validateVideoUrl(body.videoUrl);
    }

    // ----------------------------------------------
    // CATEGORY-SPECIFIC SPECIFICATIONS
    // ----------------------------------------------

    const categoryChanged =
      !isUpdate || hasOwn(body, "categoryId");

    const specificationsChanged =
      !isUpdate || hasOwn(body, "specifications");

    if (categoryChanged || specificationsChanged) {
      const categoryId =
        body.categoryId || current.categoryId;

      if (!mongoose.isValidObjectId(categoryId)) {
        throw new ProductValidationError(
          "A valid category is required for product specifications."
        );
      }

      const category = await Category.findOne({
        _id: categoryId,
        isActive: true,
      }).lean();

      if (!category) {
        throw new ProductValidationError(
          "Selected category does not exist or is inactive."
        );
      }

      const submittedSpecifications =
        hasOwn(body, "specifications")
          ? body.specifications
          : current.specifications || [];

      const normalizedSpecifications =
        validateCategorySpecifications(
          category,
          submittedSpecifications
        );

      // The backend uses the category's canonical labels and groups.
      body.specifications = normalizedSpecifications;
    }

    return next();
  } catch (error) {
    if (
      error instanceof ProductValidationError ||
      error.statusCode === 400
    ) {
      return sendValidationError(res, error);
    }

    console.error(
      "Product validation middleware error:",
      error
    );

    return res.status(500).json({
      message: "Unable to validate product data.",
    });
  }
};

// ======================================================
// VALIDATE CATEGORY SPECIFICATION TEMPLATE
// ======================================================

const validateCategorySpecificationTemplate = (
  req,
  res,
  next
) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({
        message: "A valid JSON object is required.",
      });
    }

    if (!hasOwn(req.body, "specificationTemplate")) {
      return next();
    }

    req.body.specificationTemplate =
      validateSpecificationTemplate(
        req.body.specificationTemplate
      );

    return next();
  } catch (error) {
    return sendValidationError(res, error);
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  validateProductPayload,
  validateCategorySpecificationTemplate,
};