
const express = require("express");

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const router = express.Router();

// Get all products
router.get("/", getProducts);

// Create a product
router.post("/", createProduct);

// Get one product
router.get("/:id", getProductById);

// Update a product
router.put("/:id", updateProduct);

// Delete a product
router.delete("/:id", deleteProduct);

module.exports = router;
