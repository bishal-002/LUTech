const multer = require("multer");

const {
  MAX_KYC_DOCUMENT_SIZE,
} = require("../services/sellerKycService");

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_KYC_DOCUMENT_SIZE,
    files: 1,
  },

  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error("Only JPG, PNG, and PDF files are accepted.")
      );
    }

    return callback(null, true);
  },
});

const uploadSellerKycDocument = (req, res, next) => {
  upload.single("document")(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          message: "KYC documents cannot exceed 5 MB.",
        });
      }

      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(400).json({
      message: error.message || "Document upload failed.",
    });
  });
};

module.exports = {
  uploadSellerKycDocument,
};