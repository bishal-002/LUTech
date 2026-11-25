
const express = require("express");

const {
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getMyProducts,
} = require("../controllers/productController");

const {
  createProduct,
} = require("../controllers/productCreationController");

const {
  getProductCompatibility,
  updateProductCompatibility,
  getCompatibleProducts,
} = require("../controllers/productCompatibilityController");

const {
  uploadProductImage,
  uploadProductVideo,
  uploadProductVerificationProof,
} = require("../controllers/productUploadController");

const {
  validateProductPayload,
} = require("../middleware/productValidationMiddleware");

const {
  validateCompatibilityOnCreate,
  validateCompatibilityOnUpdate,
} = require("../middleware/productCompatibilityMiddleware");

const {
  uploadProductImageFile,
  uploadProductVideoFile,
  uploadProductProofFile,
} = require("../middleware/productUploadMiddleware");

const {
  PUBLIC_PRODUCT_MEDIA_ROOT,
} = require("../services/productStorageService");

const {
  protect,
  sellerOnly,
} = require("../middleware/authMiddleware");

const {
  requireAdminPermission,
} = require("../middleware/adminPermissionMiddleware");

const router = express.Router();

// ======================================================
// PUBLIC PRODUCT MEDIA
// ======================================================

router.use(
  "/media",
  express.static(PUBLIC_PRODUCT_MEDIA_ROOT, {
    dotfiles: "deny",
    index: false,
    fallthrough: true,
    maxAge: "1y",
    immutable: true,
  })
);

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

const approvedSellerOnly = (req, res, next) => {
  if (req.user?.role === "admin") {
    return res.status(403).json({
      message:
        "Administrators must suspend products through the product moderation API.",
    });
  }

  return sellerOnly(req, res, next);
};

// ======================================================
// IMAGE / VIDEO UPLOAD
// ======================================================

router.post(
  "/uploads/image",
  protect,
  adminOrApprovedSeller("approve_products"),
  uploadProductImageFile,
  uploadProductImage
);

router.post(
  "/uploads/video",
  protect,
  adminOrApprovedSeller("approve_products"),
  uploadProductVideoFile,
  uploadProductVideo
);

// ======================================================
// PRODUCT VERIFICATION PROOF
// ======================================================

router.post(
  "/:id/verification-proof",
  protect,
  adminOrApprovedSeller("approve_products"),
  uploadProductProofFile,
  uploadProductVerificationProof
);

// ======================================================
// PUBLIC DEVICE COMPATIBILITY ROUTES
// ======================================================

// Find all approved products compatible with a device.
router.get(
  "/compatible/:deviceId",
  getCompatibleProducts
);

// Retrieve compatibility information for one product.
router.get(
  "/:id/compatibility",
  getProductCompatibility
);

// ======================================================
// PUBLIC PRODUCT ROUTES
// ======================================================

router.get(
  "/",
  getProducts
);

router.get(
  "/mine",
  protect,
  sellerOnly,
  getMyProducts
);

router.get(
  "/:id",
  getProductById
);

// ======================================================
// CREATE PRODUCT
// ======================================================

router.post(
  "/",
  protect,
  adminOrApprovedSeller("approve_products"),
  validateProductPayload,
  validateCompatibilityOnCreate,
  createProduct
);

// ======================================================
// UPDATE PRODUCT COMPATIBILITY
// ======================================================

router.put(
  "/:id/compatibility",
  protect,
  adminOrApprovedSeller("approve_products"),
  validateCompatibilityOnUpdate,
  updateProductCompatibility
);

// ======================================================
// UPDATE PRODUCT
// ======================================================

router.put(
  "/:id",
  protect,
  adminOrApprovedSeller("approve_products"),
  validateProductPayload,
  updateProduct
);

// ======================================================
// DELETE PRODUCT
// ======================================================

router.delete(
  "/:id",
  protect,
  approvedSellerOnly,
  deleteProduct
);

module.exports = router;
