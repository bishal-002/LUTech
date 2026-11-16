
const mongoose = require("mongoose");
const Product = require("../models/Product");

// Fields that can be submitted when creating or updating a product.
// Seller ownership fields are deliberately excluded.
const allowedFields = [
  "title",
  "slug",
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

// Pick only fields supported by the Product model.
const getProductData = (body = {}) => {
  const data = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      data[field] = body[field];
    }
  }

  return data;
};

// Consistent error responses.
const handleProductError = (res, error) => {
  console.error("Product Controller Error:", error);

  if (error.name === "ValidationError") {
    return res.status(400).json({
      message: "Product validation failed.",
      errors: Object.values(error.errors).map((item) => item.message),
    });
  }

  if (error.name === "CastError" || error.name === "BSONError") {
    return res.status(400).json({
      message: "Invalid product data or ID.",
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      message: "A product with this unique value already exists.",
      field: Object.keys(error.keyValue || {})[0] || "unknown",
    });
  }

  return res.status(500).json({
    message: "An unexpected server error occurred.",
  });
};

// Create Product
const createProduct = async (req, res) => {
  try {
    const productData = getProductData(req.body);

    if (req.user.role === "seller") {
      // Never accept seller ownership from the frontend.
      productData.sellerId = req.user._id;
      productData.seller = req.user._id;
    }

    const product = await Product.create(productData);

    return res.status(201).json({
      message: "Product created successfully.",
      product,
    });
  } catch (error) {
    return handleProductError(res, error);
  }
};

// Get All Products
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({})
      .sort({ createdAt: -1 });

    return res.status(200).json(products);
  } catch (error) {
    return handleProductError(res, error);
  }
};

// Get Single Product
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    return res.status(200).json(product);
  } catch (error) {
    return handleProductError(res, error);
  }
};

// Update Product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
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

    // Sellers can update only products belonging to their account.
    const filter = { _id: id };

    if (req.user.role === "seller") {
      filter.$or = [
        { sellerId: req.user._id },
        { seller: req.user._id },
      ];
    }

    const product = await Product.findOne(filter);

    if (!product) {
      return res.status(404).json({
        message: "Product not found or access denied.",
      });
    }

    product.set(updateData);

    const updatedProduct = await product.save();

    return res.status(200).json({
      message: "Product updated successfully.",
      product: updatedProduct,
    });
  } catch (error) {
    return handleProductError(res, error);
  }
};

// Delete Product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const filter = { _id: id };

    // Sellers can delete only their own products.
    if (req.user.role === "seller") {
      filter.$or = [
        { sellerId: req.user._id },
        { seller: req.user._id },
      ];
    }

    const product = await Product.findOne(filter);

    if (!product) {
      return res.status(404).json({
        message: "Product not found or access denied.",
      });
    }

    await product.deleteOne();

    return res.status(200).json({
      message: "Product deleted successfully.",
    });
  } catch (error) {
    return handleProductError(res, error);
  }
};

// Get Products Belonging to the Logged-in Seller
const getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({
      $or: [
        { sellerId: req.user._id },
        { seller: req.user._id },
      ],
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      count: products.length,
      products,
    });
  } catch (error) {
    return handleProductError(res, error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getMyProducts,
};
