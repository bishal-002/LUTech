const multer = require("multer");

const {
  MAX_PRODUCT_IMAGE_SIZE,
  MAX_PRODUCT_VIDEO_SIZE,
  MAX_PRODUCT_PROOF_SIZE,
} = require("../services/productStorageService");

// ======================================================
// COMMON UPLOAD HANDLER
// ======================================================

const createUploadMiddleware = ({
  fieldName,
  allowedMimeTypes,
  maxFileSize,
  label,
}) => {
  const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
      fileSize: maxFileSize,
      files: 1,
      fields: 10,
      parts: 12,
    },

    fileFilter: (req, file, callback) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        const error = new Error(
          `Only supported ${label} file formats are accepted.`
        );

        error.statusCode = 415;

        return callback(error);
      }

      return callback(null, true);
    },
  });

  return (req, res, next) => {
    upload.single(fieldName)(req, res, (error) => {
      if (!error) {
        return next();
      }

      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            message:
              `${label} file exceeds the maximum allowed size of ` +
              `${Math.floor(maxFileSize / (1024 * 1024))} MB.`,
          });
        }

        return res.status(400).json({
          message: error.message || "Invalid upload request.",
        });
      }

      return res.status(error.statusCode || 415).json({
        message:
          error.message ||
          `${label} upload validation failed.`,
      });
    });
  };
};

// ======================================================
// IMAGE UPLOAD
// multipart/form-data field: image
// ======================================================

const uploadProductImageFile = createUploadMiddleware({
  fieldName: "image",
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
  ],
  maxFileSize: MAX_PRODUCT_IMAGE_SIZE,
  label: "Product image",
});

// ======================================================
// VIDEO UPLOAD
// multipart/form-data field: video
// ======================================================

const uploadProductVideoFile = createUploadMiddleware({
  fieldName: "video",
  allowedMimeTypes: [
    "video/mp4",
    "video/webm",
  ],
  maxFileSize: MAX_PRODUCT_VIDEO_SIZE,
  label: "Product video",
});

// ======================================================
// PRIVATE PROOF UPLOAD
// multipart/form-data field: proof
// ======================================================

const uploadProductProofFile = createUploadMiddleware({
  fieldName: "proof",
  allowedMimeTypes: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ],
  maxFileSize: MAX_PRODUCT_PROOF_SIZE,
  label: "Product proof",
});

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  uploadProductImageFile,
  uploadProductVideoFile,
  uploadProductProofFile,
};