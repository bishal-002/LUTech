const mongoose = require("mongoose");

const Product = require("../models/Product");

const {
  storePublicProductMedia,
  storePrivateProductProof,
  isPrivateProductProofKey,
  deletePrivateProductProof,
} = require("../services/productStorageService");

const ALLOWED_IMAGE_SLOTS = [
  "main",
  "ports",
  "packaging",
  "scale",
  "extra",
];

const getPublicBaseUrl = (req) => {
  const configuredUrl = process.env.PUBLIC_API_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  return `${req.protocol}://${req.get("host")}`;
};

const createMediaUrl = (req, storageKey) => {
  return new URL(
    `/api/products/media/${storageKey}`,
    `${getPublicBaseUrl(req)}/`
  ).toString();
};

const handleUploadError = (res, error, fallback) => {
  const statusCode = error.statusCode || 500;

  if (statusCode === 500) {
    console.error(fallback, error);
  }

  return res.status(statusCode).json({
    message:
      statusCode === 500
        ? fallback
        : error.message,
  });
};

const getProductForProofUpload = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return null;
  }

  const product = await Product.findById(
    req.params.id
  ).select("+verificationProof");

  if (!product) {
    return null;
  }

  if (req.user.role === "seller") {
    const ownerId = product.sellerId || product.seller;

    if (
      !ownerId ||
      ownerId.toString() !== req.user._id.toString()
    ) {
      return null;
    }
  }

  return product;
};

// ======================================================
// UPLOAD PRODUCT IMAGE
// POST /api/products/uploads/image
// Form-data: image, slot
// ======================================================

const uploadProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Select an image file to upload.",
      });
    }

    const slot = String(req.body.slot || "").trim();

    if (!ALLOWED_IMAGE_SLOTS.includes(slot)) {
      return res.status(400).json({
        message:
          "Image slot must be main, ports, packaging, scale or extra.",
      });
    }

    const stored = await storePublicProductMedia(
      req.file,
      "image"
    );

    return res.status(201).json({
      success: true,
      message: "Product image uploaded successfully.",
      media: {
        url: createMediaUrl(req, stored.storageKey),
        slot,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
      },
    });
  } catch (error) {
    return handleUploadError(
      res,
      error,
      "Unable to upload product image."
    );
  }
};

// ======================================================
// UPLOAD PRODUCT VIDEO
// POST /api/products/uploads/video
// Form-data: video
// ======================================================

const uploadProductVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Select a video file to upload.",
      });
    }

    const stored = await storePublicProductMedia(
      req.file,
      "video"
    );

    return res.status(201).json({
      success: true,
      message: "Product video uploaded successfully.",
      media: {
        url: createMediaUrl(req, stored.storageKey),
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
      },
    });
  } catch (error) {
    return handleUploadError(
      res,
      error,
      "Unable to upload product video."
    );
  }
};

// ======================================================
// SUBMIT / REPLACE PRIVATE PRODUCT PROOF
// POST /api/products/:id/verification-proof
// Form-data: proof
// ======================================================

const uploadProductVerificationProof = async (
  req,
  res
) => {
  let newStorageKey = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Select a product proof document to upload.",
      });
    }

    const product = await getProductForProofUpload(req);

    if (!product) {
      return res.status(404).json({
        message: "Product not found or access denied.",
      });
    }

    const previousStorageKey =
      product.verificationProof;

    const stored = await storePrivateProductProof(
      product._id,
      req.file
    );

    newStorageKey = stored.storageKey;

    product.verificationProof = stored.storageKey;

    // Save before deleting the old proof.
    await product.save();

    // The new private document is now referenced by MongoDB.
    // Do not delete it in the catch block if old-file cleanup fails.
    newStorageKey = null;

    if (
      previousStorageKey &&
      previousStorageKey !== stored.storageKey &&
      isPrivateProductProofKey(previousStorageKey)
    ) {
      try {
        await deletePrivateProductProof(
          previousStorageKey
        );
      } catch (cleanupError) {
        console.error(
          "Previous product proof cleanup failed:",
          cleanupError.message
        );
      }
    }

    return res.status(201).json({
      success: true,
      message:
        "Product verification proof submitted securely.",
      proof: {
        uploaded: true,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        uploadedAt: stored.uploadedAt,
      },
    });
  } catch (error) {
    if (newStorageKey) {
      await deletePrivateProductProof(
        newStorageKey
      ).catch(() => {});
    }

    return handleUploadError(
      res,
      error,
      "Unable to submit product verification proof."
    );
  }
};

module.exports = {
  uploadProductImage,
  uploadProductVideo,
  uploadProductVerificationProof,
};