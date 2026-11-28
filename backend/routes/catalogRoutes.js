
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

const requireManageBrands =
  requireAdminPermission("manage_brands");

const requireManageCategories =
  requireAdminPermission("manage_categories");

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
  requireManageBrands,
  getAllBrandsAdmin
);

router.get(
  "/admin/categories",
  requireManageCategories,
  getAllCategoriesAdmin
);

// ======================================================
// ADMIN DEVICE MANAGEMENT
// ======================================================

router.get(
  "/admin/devices",
  requireManageCategories,
  getAllDevicesAdmin
);

router.post(
  "/admin/devices",
  requireManageCategories,
  createDevice
);

router.put(
  "/admin/devices/:id",
  requireManageCategories,
  updateDevice
);

router.patch(
  "/admin/devices/:id/deactivate",
  requireManageCategories,
  deactivateDevice
);

// ======================================================
// ADMIN BRAND MANAGEMENT
// ======================================================

router.post(
  "/brands",
  protect,
  adminOnly,
  requireManageBrands,
  createBrand
);

router.put(
  "/brands/:id",
  protect,
  adminOnly,
  requireManageBrands,
  updateBrand
);

router.delete(
  "/brands/:id",
  protect,
  adminOnly,
  requireManageBrands,
  deactivateBrand
);

// ======================================================
// ADMIN CATEGORY MANAGEMENT
// ======================================================

router.post(
  "/categories",
  protect,
  adminOnly,
  requireManageCategories,
  requireSchemaPermissionWhenPresent,
  validateCategorySpecificationTemplate,
  createCategory
);

router.put(
  "/categories/:id",
  protect,
  adminOnly,
  requireManageCategories,
  requireSchemaPermissionWhenPresent,
  validateCategorySpecificationTemplate,
  updateCategory
);

router.delete(
  "/categories/:id",
  protect,
  adminOnly,
  requireManageCategories,
  deactivateCategory
);

module.exports = router;
