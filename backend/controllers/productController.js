
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Brand = require("../models/Brand");
const Category = require("../models/Category");

// ======================================================
// CONFIGURATION
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

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

// ======================================================
// HELPERS
// ======================================================

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object, key);

const getProductData = (body = {}) => {
  const data = {};

  for (const field of ALLOWED_PRODUCT_FIELDS) {
    if (hasOwn(body, field)) {
      data[field] = body[field];
    }
  }

  return data;
};

const isValidObjectId = (id) =>
  mongoose.isValidObjectId(id);

const getSellerId = (user) =>
  user?._id || user?.id || null;

const isAdmin = (user) => user?.role === "admin";

const getPagination = (query = {}) => {
  const requestedPage = Number.parseInt(query.page, 10);
  const requestedLimit = Number.parseInt(query.limit, 10);

  const page =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : DEFAULT_PAGE;

  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const handleProductError = (res, error) => {
  console.error("Product Controller Error:", error);

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
      message: "A product with this unique value already exists.",
      field:
        Object.keys(error.keyValue || {})[0] || "unknown",
    });
  }

  return res.status(500).json({
    message: "An unexpected server error occurred.",
  });
};

// Restrict seller access to their own products.
// Admins can access all products.
const getProductOwnershipFilter = (user, productId = null) => {
  const filter = {};

  if (productId) {
    filter._id = productId;
  }

  if (!isAdmin(user)) {
    const sellerId = getSellerId(user);

    filter.$or = [
      { sellerId },
      { seller: sellerId },
    ];
  }

  return filter;
};

// ======================================================
// CREATE PRODUCT
// ======================================================

const createProduct = async (req, res) => {
  try {
    const user = req.user;

    if (!user || !["seller", "admin"].includes(user.role)) {
      return res.status(403).json({
        message: "Only sellers and administrators can create products.",
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

    // Verify that the selected brand and category exist and are active.
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
        message: "Selected brand does not exist or is inactive.",
      });
    }

    if (!category) {
      return res.status(400).json({
        message: "Selected category does not exist or is inactive.",
      });
    }

    if (!productData.images) {
      return res.status(400).json({
        message: "Product images are required.",
      });
    }

    if (!productData.variants) {
      return res.status(400).json({
        message: "At least one product variant is required.",
      });
    }

    // Ownership is always assigned by the backend.
    // A seller cannot create a product for another seller.
    const sellerId = getSellerId(user);

    if (!sellerId) {
      return res.status(400).json({
        message: "Unable to identify the product owner.",
      });
    }

    productData.sellerId = sellerId;
    productData.seller = sellerId;

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

// ======================================================
// GET ALL PRODUCTS
// ======================================================

const getProducts = async (req, res) => {
  try {
    const {
      page,
      limit,
      skip,
    } = getPagination(req.query);

    const filter = {};

    // Search by title, tags, or MPN.
    if (req.query.search?.trim()) {
      const searchTerm = req.query.search.trim();

      filter.$or = [
        {
          title: {
            $regex: searchTerm,
            $options: "i",
          },
        },
        {
          tags: {
            $regex: searchTerm,
            $options: "i",
          },
        },
        {
          mpn: {
            $regex: searchTerm,
            $options: "i",
          },
        },
      ];
    }

    // Category filtering.
    if (req.query.categoryId) {
      if (!isValidObjectId(req.query.categoryId)) {
        return res.status(400).json({
          message: "Invalid category ID.",
        });
      }

      filter.categoryId = req.query.categoryId;
    }

    // Brand filtering.
    if (req.query.brandId) {
      if (!isValidObjectId(req.query.brandId)) {
        return res.status(400).json({
          message: "Invalid brand ID.",
        });
      }

      filter.brandId = req.query.brandId;
    }

    // Condition filtering.
    if (req.query.condition) {
      filter.condition = req.query.condition;
    }

    // Region filtering.
    if (req.query.regionVariant) {
      filter.regionVariant = req.query.regionVariant;
    }

    // Seller filtering.
    if (req.query.sellerId) {
      if (!isValidObjectId(req.query.sellerId)) {
        return res.status(400).json({
          message: "Invalid seller ID.",
        });
      }

      filter.$and = [
        {
          $or: [
            { sellerId: req.query.sellerId },
            { seller: req.query.sellerId },
          ],
        },
      ];
    }

    // Price filtering using variant prices.
    const minPrice =
      req.query.minPrice !== undefined
        ? Number(req.query.minPrice)
        : null;

    const maxPrice =
      req.query.maxPrice !== undefined
        ? Number(req.query.maxPrice)
        : null;

    if (
      minPrice !== null &&
      (!Number.isFinite(minPrice) || minPrice < 0)
    ) {
      return res.status(400).json({
        message: "Invalid minimum price.",
      });
    }

    if (
      maxPrice !== null &&
      (!Number.isFinite(maxPrice) || maxPrice < 0)
    ) {
      return res.status(400).json({
        message: "Invalid maximum price.",
      });
    }

    if (
      minPrice !== null &&
      maxPrice !== null &&
      minPrice > maxPrice
    ) {
      return res.status(400).json({
        message: "Minimum price cannot exceed maximum price.",
      });
    }

    if (minPrice !== null || maxPrice !== null) {
      const priceFilter = {};

      if (minPrice !== null) {
        priceFilter.$gte = minPrice;
      }

      if (maxPrice !== null) {
        priceFilter.$lte = maxPrice;
      }

      filter.variants = {
        $elemMatch: {
          $or: [
            { salePrice: priceFilter },
            {
              $and: [
                {
                  $or: [
                    { salePrice: null },
                    { salePrice: { $exists: false } },
                  ],
                },
                { regularPrice: priceFilter },
              ],
            },
          ],
        },
      };
    }

    // Sorting.
    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      price_low: { price: 1 },
      price_high: { price: -1 },
      name_asc: { title: 1 },
      name_desc: { title: -1 },
    };

    const sort =
      sortOptions[req.query.sort] ||
      sortOptions.newest;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("brandId", "name")
        .populate("categoryId", "name")
        .populate("sellerId", "name")
        .lean(),

      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: products.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      products,
    });
  } catch (error) {
    return handleProductError(res, error);
  }
};

// ======================================================
// GET SINGLE PRODUCT
// ======================================================

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findById(id)
      .populate("brandId", "name")
      .populate("categoryId", "name")
      .populate("sellerId", "name")
      .lean();

    if (!product) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    return handleProductError(res, error);
  }
};

// ======================================================
// UPDATE PRODUCT
// ======================================================

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const updateData = getProductData(req.body);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No valid product fields were provided.",
      });
    }

    const filter = getProductOwnershipFilter(user, id);

    const product = await Product.findOne(filter);

    if (!product) {
      return res.status(404).json({
        message: "Product not found or access denied.",
      });
    }

    // Prevent accidental ownership changes.
    // Prevent accidental ownership changes.
    delete updateData.sellerId;
    delete updateData.seller;

    // Validate a changed brand reference.
    if (updateData.brandId !== undefined) {
      const brand = await Brand.findOne({
        _id: updateData.brandId,
        isActive: true,
      }).select("_id");

      if (!brand) {
        return res.status(400).json({
          message: "Selected brand does not exist or is inactive.",
        });
      }
    }

    // Validate a changed category reference.
    if (updateData.categoryId !== undefined) {
      const category = await Category.findOne({
        _id: updateData.categoryId,
        isActive: true,
      }).select("_id");

      if (!category) {
        return res.status(400).json({
          message: "Selected category does not exist or is inactive.",
        });
      }
    }

    product.set(updateData);

    const updatedProduct = await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      product: updatedProduct,
    });
  } catch (error) {
    return handleProductError(res, error);
  }
};

// ======================================================
// DELETE PRODUCT
// ======================================================

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const filter = getProductOwnershipFilter(req.user, id);

    const product = await Product.findOne(filter);

    if (!product) {
      return res.status(404).json({
        message: "Product not found or access denied.",
      });
    }

    await product.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully.",
    });
  } catch (error) {
    return handleProductError(res, error);
  }
};

// ======================================================
// GET LOGGED-IN SELLER'S PRODUCTS
// ======================================================

const getMyProducts = async (req, res) => {
  try {
    const sellerId = getSellerId(req.user);

    if (!sellerId) {
      return res.status(400).json({
        message: "Unable to identify the seller.",
      });
    }

    const {
      page,
      limit,
      skip,
    } = getPagination(req.query);

    const filter = {
      $or: [
        { sellerId },
        { seller: sellerId },
      ],
    };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("brandId", "name")
        .populate("categoryId", "name")
        .lean(),

      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: products.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      products,
    });
  } catch (error) {
    return handleProductError(res, error);
  }
};

// ======================================================
// EXPORT CONTROLLERS
// ======================================================

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getMyProducts,
};
