
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
  getDevices,
  getDeviceById,
  getAllDevicesAdmin,
  createDevice,
  updateDevice,
  deactivateDevice,
} = require("../controllers/deviceController");

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

const {
  requireAdminPermission,
} = require("../middleware/adminPermissionMiddleware");

const router = express.Router();

// ======================================================
// CATEGORY SCHEMA PERMISSION
// ======================================================

// Ordinary category edits do not require the schema-edit
// permission. Only requests containing specificationTemplate
// must pass the dedicated permission check.

const requireEditCategorySchemasPermission =
  requireAdminPermission(
    "edit_category_schemas"
  );

const requireSchemaPermissionWhenPresent = (
  req,
  res,
  next
) => {
  const schemaWasSubmitted =
    Object.prototype.hasOwnProperty.call(
      req.body || {},
      "specificationTemplate"
    );

  if (!schemaWasSubmitted) {
    return next();
  }

  return requireEditCategorySchemasPermission(
    req,
    res,
    next
  );
};

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

router.get(
  "/brands",
  getBrands
);

router.get(
  "/brands/:id",
  getBrandById
);

// ======================================================
// PUBLIC CATEGORY ROUTES
// ======================================================

router.get(
  "/categories",
  getCategories
);

router.get(
  "/categories/:id",
  getCategoryById
);

// ======================================================
// PUBLIC DEVICE ROUTES
// ======================================================

router.get(
  "/devices",
  getDevices
);

router.get(
  "/devices/:id",
  getDeviceById
);

// ======================================================
// ADMIN READ ROUTES
// ======================================================

router.use(
  "/admin",
  protect,
  adminOnly
);

router.get(
  "/admin/brands",
  getAllBrandsAdmin
);

router.get(
  "/admin/categories",
  getAllCategoriesAdmin
);

// ======================================================
// ADMIN DEVICE MANAGEMENT
// ======================================================

router.get(
  "/admin/devices",
  requireAdminPermission("manage_categories"),
  getAllDevicesAdmin
);

router.post(
  "/admin/devices",
  requireAdminPermission("manage_categories"),
  createDevice
);

router.put(
  "/admin/devices/:id",
  requireAdminPermission("manage_categories"),
  updateDevice
);

router.patch(
  "/admin/devices/:id/deactivate",
  requireAdminPermission("manage_categories"),
  deactivateDevice
);

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

// Create category.
// If a specification template is submitted,
// edit_category_schemas permission is required.

router.post(
  "/categories",
  protect,
  adminOnly,
  requireSchemaPermissionWhenPresent,
  validateCategorySpecificationTemplate,
  createCategory
);

// Update category.
// Ordinary category fields retain the existing behavior.
// Schema changes require edit_category_schemas.

router.put(
  "/categories/:id",
  protect,
  adminOnly,
  requireSchemaPermissionWhenPresent,
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
