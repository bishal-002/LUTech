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
// ADMIN ROUTES
// ======================================================

router.use("/admin", protect, adminOnly);

router.get("/admin/brands", getAllBrandsAdmin);
router.get("/admin/categories", getAllCategoriesAdmin);

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

router.post(
  "/categories",
  protect,
  adminOnly,
  createCategory
);

router.put(
  "/categories/:id",
  protect,
  adminOnly,
  updateCategory
);

router.delete(
  "/categories/:id",
  protect,
  adminOnly,
  deactivateCategory
);

module.exports = router;