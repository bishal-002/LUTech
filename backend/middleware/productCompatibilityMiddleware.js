const mongoose = require("mongoose");

const Device = require("../models/Device");
const Product = require("../models/Product");

const isValidId = (id) =>
  mongoose.isValidObjectId(id);

const approvedProductFilter = {
  $or: [
    {
      moderationStatus: "approved",
    },
    {
      moderationStatus: {
        $exists: false,
      },
    },
  ],
};

const populateCompatibility = (query) =>
  query.populate(
    "compatibility.devices.deviceId",
    "deviceType brand model modelNumber slug isActive"
  );

// ======================================================
// GET PRODUCT COMPATIBILITY
// GET /api/products/:id/compatibility
// ======================================================

const getProductCompatibility = async (
  req,
  res
) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const product = await populateCompatibility(
      Product.findOne({
        _id: req.params.id,
        ...approvedProductFilter,
      })
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      productId: product._id,
      compatibility: product.compatibility,
    });
  } catch (error) {
    console.error(
      "Get product compatibility:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to retrieve product compatibility.",
    });
  }
};

// ======================================================
// UPDATE PRODUCT COMPATIBILITY
// PUT /api/products/:id/compatibility
// ======================================================

const updateProductCompatibility = async (
  req,
  res
) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const filter = {
      _id: req.params.id,
    };

    if (req.user?.role !== "admin") {
      filter.$or = [
        {
          sellerId: req.user?._id,
        },
        {
          seller: req.user?._id,
        },
      ];
    }

    const product = await Product.findOne(filter);

    if (!product) {
      return res.status(404).json({
        message:
          "Product not found or access denied.",
      });
    }

    product.compatibility =
      req.compatibilityPayload;

    await product.save({
      validateModifiedOnly: true,
    });

    await product.populate(
      "compatibility.devices.deviceId",
      "deviceType brand model modelNumber slug isActive"
    );

    return res.status(200).json({
      success: true,
      message:
        "Product compatibility updated successfully.",
      productId: product._id,
      compatibility: product.compatibility,
    });
  } catch (error) {
    console.error(
      "Update product compatibility:",
      error
    );

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message:
        "Unable to update product compatibility.",
    });
  }
};

// ======================================================
// FIND COMPATIBLE PRODUCTS
// GET /api/products/compatible/:deviceId
// ======================================================

const getCompatibleProducts = async (
  req,
  res
) => {
  try {
    const { deviceId } = req.params;

    if (!isValidId(deviceId)) {
      return res.status(400).json({
        message: "Invalid device ID.",
      });
    }

    const device = await Device.findOne({
      _id: deviceId,
      isActive: true,
    }).lean();

    if (!device) {
      return res.status(404).json({
        message:
          "Device not found or inactive.",
      });
    }

    const pageValue = Number.parseInt(
      req.query.page,
      10
    );

    const limitValue = Number.parseInt(
      req.query.limit,
      10
    );

    const page =
      Number.isInteger(pageValue) && pageValue > 0
        ? pageValue
        : 1;

    const limit =
      Number.isInteger(limitValue) &&
      limitValue > 0
        ? Math.min(limitValue, 100)
        : 12;

    const compatibilityFilter = {
      $or: [
        {
          "compatibility.mode": "universal",
        },
        {
          "compatibility.mode": "specific",
          "compatibility.devices.deviceId":
            device._id,
        },
      ],
    };

    const filter = {
      $and: [
        approvedProductFilter,
        compatibilityFilter,
      ],
    };

    const [products, total] = await Promise.all([
      populateCompatibility(
        Product.find(filter)
          .sort({
            createdAt: -1,
          })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate("brandId", "name")
          .populate("categoryId", "name")
          .populate("sellerId", "name")
      ).lean(),

      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      device,
      count: products.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      products,
    });
  } catch (error) {
    console.error(
      "Find compatible products:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to find compatible products.",
    });
  }
};

module.exports = {
  getProductCompatibility,
  updateProductCompatibility,
  getCompatibleProducts,
};