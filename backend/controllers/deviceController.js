const mongoose = require("mongoose");
const Device = require("../models/Device");

const isValidId = (value) =>
  mongoose.isValidObjectId(value);

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const handleError = (res, error) => {
  console.error("Device catalog error:", error);

  if (error.code === 11000) {
    return res.status(409).json({
      message:
        "A device with the same identity or slug already exists.",
    });
  }

  if (
    [
      "ValidationError",
      "CastError",
      "BSONError",
    ].includes(error.name)
  ) {
    return res.status(400).json({
      message: error.message,
    });
  }

  return res.status(500).json({
    message:
      "Unable to process device catalog request.",
  });
};

const validateAliases = (aliases) => {
  if (aliases === undefined) {
    return undefined;
  }

  if (
    !Array.isArray(aliases) ||
    aliases.length > 20
  ) {
    throw Object.assign(
      new Error(
        "Aliases must be an array with no more than 20 entries."
      ),
      { statusCode: 400 }
    );
  }

  if (
    aliases.some(
      (item) =>
        typeof item !== "string" ||
        !item.trim() ||
        item.trim().length > 100
    )
  ) {
    throw Object.assign(
      new Error(
        "Each alias must contain 1–100 characters."
      ),
      { statusCode: 400 }
    );
  }

  return [
    ...new Map(
      aliases.map((item) => [
        item.trim().toLowerCase(),
        item.trim(),
      ])
    ).values(),
  ];
};

const validateReleaseYear = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const year = Number(value);

  if (
    !Number.isInteger(year) ||
    year < 1970 ||
    year > 2100
  ) {
    throw Object.assign(
      new Error(
        "Release year must be a whole number between 1970 and 2100."
      ),
      { statusCode: 400 }
    );
  }

  return year;
};

// ======================================================
// PUBLIC DEVICE LIST
// GET /api/catalog/devices
// ======================================================

const getDevices = async (req, res) => {
  try {
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
        : 25;

    const filter = {
      isActive: true,
    };

    if (req.query.deviceType) {
      const allowed =
        Device.schema
          .path("deviceType")
          .enumValues;

      if (
        !allowed.includes(req.query.deviceType)
      ) {
        return res.status(400).json({
          message: "Invalid device type.",
        });
      }

      filter.deviceType = req.query.deviceType;
    }

    if (req.query.brand?.trim()) {
      filter.brand = {
        $regex: escapeRegex(
          req.query.brand.trim()
        ),
        $options: "i",
      };
    }

    if (req.query.search?.trim()) {
      const term = escapeRegex(
        req.query.search.trim()
      );

      filter.$or = [
        {
          brand: {
            $regex: term,
            $options: "i",
          },
        },
        {
          model: {
            $regex: term,
            $options: "i",
          },
        },
        {
          modelNumber: {
            $regex: term,
            $options: "i",
          },
        },
        {
          aliases: {
            $regex: term,
            $options: "i",
          },
        },
      ];
    }

    const [devices, total] = await Promise.all([
      Device.find(filter)
        .sort({
          brand: 1,
          model: 1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Device.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: devices.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      devices,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ======================================================
// GET DEVICE BY ID
// ======================================================

const getDeviceById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid device ID.",
      });
    }

    const device = await Device.findOne({
      _id: req.params.id,
      isActive: true,
    }).lean();

    if (!device) {
      return res.status(404).json({
        message: "Device not found.",
      });
    }

    return res.status(200).json({
      success: true,
      device,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ======================================================
// ADMIN: GET ALL DEVICES
// ======================================================

const getAllDevicesAdmin = async (
  req,
  res
) => {
  try {
    const devices = await Device.find()
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: devices.length,
      devices,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ======================================================
// ADMIN: CREATE DEVICE
// ======================================================

const createDevice = async (req, res) => {
  try {
    const {
      deviceType,
      brand,
      model,
    } = req.body;

    if (
      req.body.isActive !== undefined &&
      typeof req.body.isActive !== "boolean"
    ) {
      return res.status(400).json({
        message: "isActive must be true or false.",
      });
    }

    if (
      typeof deviceType !== "string" ||
      typeof brand !== "string" ||
      typeof model !== "string" ||
      !deviceType.trim() ||
      !brand.trim() ||
      !model.trim()
    ) {
      return res.status(400).json({
        message:
          "deviceType, brand and model are required.",
      });
    }

    const device = await Device.create({
      deviceType: deviceType.trim(),
      brand: brand.trim(),
      model: model.trim(),

      modelNumber:
        typeof req.body.modelNumber === "string"
          ? req.body.modelNumber.trim()
          : "",

      aliases:
        validateAliases(req.body.aliases) || [],

      releaseYear: validateReleaseYear(
        req.body.releaseYear
      ),

      notes:
        typeof req.body.notes === "string"
          ? req.body.notes.trim()
          : "",

      isActive:
        req.body.isActive === undefined
          ? true
          : req.body.isActive,

      slug:
        typeof req.body.slug === "string"
          ? req.body.slug.trim()
          : undefined,
    });

    return res.status(201).json({
      success: true,
      message: "Device created successfully.",
      device,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    return handleError(res, error);
  }
};

// ======================================================
// ADMIN: UPDATE DEVICE
// ======================================================

const updateDevice = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid device ID.",
      });
    }

    const device = await Device.findById(
      req.params.id
    );

    if (!device) {
      return res.status(404).json({
        message: "Device not found.",
      });
    }

    const allowed = [
      "deviceType",
      "brand",
      "model",
      "modelNumber",
      "aliases",
      "releaseYear",
      "notes",
      "isActive",
      "slug",
    ];

    const updates = {};

    for (const field of allowed) {
      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          field
        )
      ) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message:
          "No valid device fields provided.",
      });
    }

    const maxLengths = {
      deviceType: 40,
      brand: 80,
      model: 120,
      modelNumber: 80,
      notes: 500,
      slug: 180,
    };

    for (const [field, maxLength] of Object.entries(
      maxLengths
    )) {
      if (
        updates[field] !== undefined &&
        (
          typeof updates[field] !== "string" ||
          updates[field].length > maxLength
        )
      ) {
        return res.status(400).json({
          message: `${field} must be valid text.`,
        });
      }
    }

    if (updates.aliases !== undefined) {
      updates.aliases = validateAliases(
        updates.aliases
      );
    }

    if (updates.releaseYear !== undefined) {
      updates.releaseYear = validateReleaseYear(
        updates.releaseYear
      );
    }

    if (
      updates.isActive !== undefined &&
      typeof updates.isActive !== "boolean"
    ) {
      return res.status(400).json({
        message: "isActive must be true or false.",
      });
    }

    device.set(updates);

    await device.save();

    return res.status(200).json({
      success: true,
      message: "Device updated successfully.",
      device,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    return handleError(res, error);
  }
};

// ======================================================
// ADMIN: DEACTIVATE DEVICE
// ======================================================

const deactivateDevice = async (
  req,
  res
) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid device ID.",
      });
    }

    const device = await Device.findById(
      req.params.id
    );

    if (!device) {
      return res.status(404).json({
        message: "Device not found.",
      });
    }

    device.isActive = false;

    await device.save();

    return res.status(200).json({
      success: true,
      message:
        "Device deactivated. Existing product references were preserved.",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getDevices,
  getDeviceById,
  getAllDevicesAdmin,
  createDevice,
  updateDevice,
  deactivateDevice,
};