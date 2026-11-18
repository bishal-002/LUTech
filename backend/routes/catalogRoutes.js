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
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

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

router.post("/brands", protect, adminOnly, createBrand);
router.put("/brands/:id", protect, adminOnly, updateBrand);
router.delete("/brands/:id", protect, adminOnly, deactivateBrand);

router.post("/categories", protect, adminOnly, createCategory);
router.put("/categories/:id", protect, adminOnly, updateCategory);
router.delete("/categories/:id", protect, adminOnly, deactivateCategory);

module.exports = router;