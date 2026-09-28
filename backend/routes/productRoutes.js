const express = require("express");

const {
  createProduct,
  getProducts,
  getProductById,
} = require("../controllers/productController");

const router = express.Router();

// Create Product
router.post("/", createProduct);

// Get All Products
router.get("/", getProducts);

// Get Single Product
router.get("/:id", getProductById);

module.exports = router;