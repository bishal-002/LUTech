const fs = require("fs");
const mongoose = require("mongoose");

const Product = require("../models/Product");

const {
  resolvePrivateProductProofPath,
  getPrivateProductProofMimeType,
} = require("../services/productStorageService");

// ======================================================
// GET PRIVATE PRODUCT VERIFICATION PROOF
// GET /api/admin/products/:id/verification-proof
// ======================================================

const getProductVerificationProof = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findById(
      id
    ).select("+verificationProof");

    if (!product) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    if (!product.verificationProof) {
      return res.status(404).json({
        message:
          "No product verification proof has been submitted.",
      });
    }

    let absolutePath;
    let mimeType;

    try {
      absolutePath = resolvePrivateProductProofPath(
        product.verificationProof
      );

      mimeType = getPrivateProductProofMimeType(
        product.verificationProof
      );
    } catch {
      return res.status(409).json({
        message:
          "The stored proof is not a supported private product document.",
      });
    }

    const stat = await fs.promises.stat(absolutePath);

    if (!stat.isFile()) {
      return res.status(404).json({
        message: "Product proof file not found.",
      });
    }

    const extension = absolutePath
      .split(".")
      .pop()
      .toLowerCase();

    res.status(200);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", String(stat.size));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="product-${id}-proof.${extension}"`
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    const stream = fs.createReadStream(absolutePath);

    stream.on("error", (error) => {
      console.error(
        "Product proof download failed:",
        error.message
      );

      if (!res.headersSent) {
        res.status(500).json({
          message: "Unable to download product proof.",
        });
      } else {
        res.destroy(error);
      }
    });

    return stream.pipe(res);
  } catch (error) {
    console.error(
      "Get product verification proof:",
      error
    );

    return res.status(500).json({
      message: "Unable to retrieve product proof.",
    });
  }
};

module.exports = {
  getProductVerificationProof,
};