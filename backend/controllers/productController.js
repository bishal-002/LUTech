const Product = require("../models/Product");

// Create Product
const createProduct = async (req, res) => {
  try {
    const { name, price, image, description } = req.body;

    if (!name || !price || !image) {
      return res.status(400).json({
        message: "Name, price and image are required",
      });
    }

    const product = await Product.create({
      name,
      price,
      image,
      description,
    });

    res.status(201).json({
      message: "Product created successfully",
      product,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

// Get All Products
const getProducts = async (req, res) => {
  try {
    const products = await Product.find();

    res.json(products);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

// Get Single Product
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json(product);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

// Update Product
const updateProduct = async (req, res) => {
  try {
    const { name, price, image, description } =
      req.body;

    const product = await Product.findById(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    product.name = name || product.name;
    product.price = price || product.price;
    product.image = image || product.image;
    product.description =
      description || product.description;

    const updatedProduct =
      await product.save();

    res.status(200).json({
      message: "Product updated successfully",
      product: updatedProduct,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

// Delete Product
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    await product.deleteOne();

    res.status(200).json({
      message: "Product deleted successfully",
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
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