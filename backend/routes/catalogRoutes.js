const express = require("express");

const {
  getBrands,
  getBrandById,
  getAllBrandsAdmin,
  createBrand,
  updateBrand,
  deactivateBrand,
  getCategories,
  getCategoryById,
  getAllCategoriesAdmin,
  createCategory,
  updateCategory,
  deactivateCategory,
} = require("../controllers/catalogController");

const {
  getSellerMasterBrands,
} = require("../controllers/sellerCatalogController");

const {
  validateCategorySpecificationTemplate,
} = require("../middleware/productValidationMiddleware");

const {
  protect,
  adminOnly,
  sellerOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ======================================================
// SELLER MASTER BRAND ROUTE
// ======================================================

router.get(
  "/seller/master-brands",
  protect,
  sellerOnly,
  getSellerMasterBrands
);

// ======================================================
// PUBLIC BRAND ROUTES
// ======================================================

router.get("/brands", getBrands);
router.get("/brands/:id", getBrandById);

// ======================================================
// PUBLIC CATEGORY ROUTES
// ======================================================

router.get("/categories", getCategories);
router.get("/categories/:id", getCategoryById);

// ======================================================
// ADMIN READ ROUTES
// ======================================================

router.use("/admin", protect, adminOnly);

router.get("/admin/brands", getAllBrandsAdmin);
router.get("/admin/categories", getAllCategoriesAdmin);

// ======================================================
// ADMIN BRAND MANAGEMENT
// ======================================================

router.post(
  "/brands",
  protect,
  adminOnly,
  createBrand
);

router.put(
  "/brands/:id",
  protect,
  adminOnly,
  updateBrand
);

router.delete(
  "/brands/:id",
  protect,
  adminOnly,
  deactivateBrand
);

// ======================================================
// ADMIN CATEGORY MANAGEMENT
// ======================================================

router.post(
  "/categories",
  protect,
  adminOnly,
  validateCategorySpecificationTemplate,
  createCategory
);

router.put(
  "/categories/:id",
  protect,
  adminOnly,
  validateCategorySpecificationTemplate,
  updateCategory
);

router.delete(
  "/categories/:id",
  protect,
  adminOnly,
  deactivateCategory
);

module.exports = router;