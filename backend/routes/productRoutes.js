
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

const {
  requireAdminPermission,
} = require("../middleware/adminPermissionMiddleware");

const router = express.Router();

// ======================================================
// ADMIN OR APPROVED SELLER MIDDLEWARE
// ======================================================

const adminOrApprovedSeller = (permission) => {
  return (req, res, next) => {
    if (req.user?.role === "admin") {
      return requireAdminPermission(permission)(
        req,
        res,
        next
      );
    }

    return sellerOnly(req, res, next);
  };
};

// Administrators cannot permanently delete products.
// They must use the suspension workflow instead.
const approvedSellerOnly = (req, res, next) => {
  if (req.user?.role === "admin") {
    return res.status(403).json({
      message:
        "Administrators must suspend products through the moderation API.",
    });
  }

  return sellerOnly(req, res, next);
};

// ======================================================
// PUBLIC PRODUCT ROUTES
// ======================================================

router.get("/", getProducts);

router.get(
  "/mine",
  protect,
  sellerOnly,
  getMyProducts
);

router.get("/:id", getProductById);

// ======================================================
// PRODUCT MANAGEMENT ROUTES
// ======================================================

// Create product.
router.post(
  "/",
  protect,
  adminOrApprovedSeller("approve_products"),
  createProduct
);

// Update product.
router.put(
  "/:id",
  protect,
  adminOrApprovedSeller("approve_products"),
  updateProduct
);

// Sellers can delete their own products.
// Administrators must use the suspension API.
router.delete(
  "/:id",
  protect,
  approvedSellerOnly,
  deleteProduct
);

module.exports = router;
