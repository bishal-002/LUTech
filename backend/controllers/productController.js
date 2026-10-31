
const Product = require("../models/Product");

// Create Product
const createProduct = async (req, res) => {
  try {
    const { name, price, image, description } = req.body;

    if (!name || price === undefined || price === null || !image) {
      return res.status(400).json({
        message: "Name, price and image are required",
      });
    }

    const productData = {
      name,
      price,
      image,
      description,
    };

    // Associate products created by sellers with their account
    if (req.user.role === "seller") {
      productData.seller = req.user._id;
    }

    const product = await Product.create(productData);

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

// Get All Products
const getProducts = async (req, res) => {
  try {
    let filter = {};

    // Sellers can only see their own products
    if (req.user && req.user.role === "seller") {
      filter.seller = req.user._id;
    }

    const products = await Product.find(filter);

    return res.json(products);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

// Get Single Product
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.json(product);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

// Update Product
const updateProduct = async (req, res) => {
  try {
    const { name, price, image, description } = req.body;

    let filter = { _id: req.params.id };

    // Sellers can update only their own products
    if (req.user.role === "seller") {
      filter.seller = req.user._id;
    }

    const product = await Product.findOne(filter);

    if (!product) {
      return res.status(404).json({
        message: "Product not found or access denied",
      });
    }

    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = price;
    if (image !== undefined) product.image = image;
    if (description !== undefined) product.description = description;

    const updatedProduct = await product.save();

    return res.status(200).json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

// Delete Product
const deleteProduct = async (req, res) => {
  try {
    let filter = { _id: req.params.id };

    // Sellers can delete only their own products
    if (req.user.role === "seller") {
      filter.seller = req.user._id;
    }

    const product = await Product.findOne(filter);

    if (!product) {
      return res.status(404).json({
        message: "Product not found or access denied",
      });
    }

    await product.deleteOne();

    return res.status(200).json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
