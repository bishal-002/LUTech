
const express = require("express");

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getMyProducts,
} = require("../controllers/productController");

const {
  protect,
  sellerOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Authorization Middleware
|--------------------------------------------------------------------------
| Allows administrators or approved sellers to manage products.
*/

const adminOrApprovedSeller = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }

  return sellerOnly(req, res, next);
};

/*
|--------------------------------------------------------------------------
| Public Product Routes
|--------------------------------------------------------------------------
*/

// Get all products
router.get("/", getProducts);

// Get a single product by ID
router.get("/:id", getProductById);

/*
|--------------------------------------------------------------------------
| Protected Seller Routes
|--------------------------------------------------------------------------
*/

// Get products belonging to the authenticated seller
router.get("/mine", protect, sellerOnly, getMyProducts);

/*
|--------------------------------------------------------------------------
| Product Management Routes
|--------------------------------------------------------------------------
| Only administrators and approved sellers can manage products.
*/

// Create a product
router.post(
  "/",
  protect,
  adminOrApprovedSeller,
  createProduct
);

// Update a product
router.put(
  "/:id",
  protect,
  adminOrApprovedSeller,
  updateProduct
);

// Delete a product
router.delete(
  "/:id",
  protect,
  adminOrApprovedSeller,
  deleteProduct
);

module.exports = router;
