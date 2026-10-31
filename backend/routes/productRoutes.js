
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
  sellerOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Allow Admin or approved Seller
const adminOrSeller = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }

  return sellerOnly(req, res, next);
};

// Public routes
router.get("/", getProducts);
router.get("/:id", getProductById);

// Admin or approved Seller routes
router.post("/", protect, adminOrSeller, createProduct);
router.put("/:id", protect, adminOrSeller, updateProduct);
router.delete("/:id", protect, adminOrSeller, deleteProduct);

module.exports = router;
