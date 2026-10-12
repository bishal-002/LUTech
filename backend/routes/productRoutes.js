
const express = require("express");

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Public: view all products
router.get("/", getProducts);

// Public: view a single product
router.get("/:id", getProductById);

// Admin only: create a product
router.post("/", protect, adminOnly, createProduct);

// Admin only: update a product
router.put("/:id", protect, adminOnly, updateProduct);

// Admin only: delete a product
router.delete("/:id", protect, adminOnly, deleteProduct);

module.exports = router;
