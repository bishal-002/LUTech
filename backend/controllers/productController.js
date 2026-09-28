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

module.exports = {
  createProduct,
  getProducts,
  getProductById,
};