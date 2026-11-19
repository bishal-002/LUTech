const mongoose = require("mongoose");

const PlatformSettings = require("../models/PlatformSettings");
const Brand = require("../models/Brand");

const {
  getPlatformSettings: getOrCreatePlatformSettings,
} = require("../services/platformSettingsService");

const {
  writeAuditLog,
} = require("../services/auditLogService");

// ======================================================
// CONSTANTS
// ======================================================

const SETTINGS_FIELDS = [
  "commissionRate",
  "autoApproveProducts",
  "codMaxOrderAmount",
  "maxRefusedCodAllowed",
  "payoutHoldDays",
  "masterBrands",
];

const ALLOWED_BODY_FIELDS = [
  ...SETTINGS_FIELDS,
  "note",
];

// ======================================================
// CUSTOM HTTP ERROR
// ======================================================

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// ======================================================
// COMMON ERROR HANDLER
// ======================================================

const handleError = (res, error, fallbackMessage) => {
  let statusCode = error.statusCode || 500;

  if (
    error.name === "ValidationError" ||
    error.name === "CastError" ||
    error.name === "BSONError"
  ) {
    statusCode = 400;
  }

  if (error.code === 11000) {
    statusCode = 409;
  }

  if (statusCode === 500) {
    console.error(fallbackMessage, error);
  }

  return res.status(statusCode).json({
    message:
      statusCode === 500
        ? fallbackMessage
        : error.message,
  });
};

// ======================================================
// SUPER ADMIN AUTHORIZATION
// ======================================================

const ensureSuperAdmin = (req, res) => {
  if (
    !req.user ||
    req.user.role !== "admin" ||
    req.adminProfile?.adminRole !== "super_admin"
  ) {
    res.status(403).json({
      message:
        "Only an authenticated Super Admin can manage platform settings.",
    });

    return false;
  }

  return true;
};

// ======================================================
// SETTINGS SNAPSHOT FOR AUDIT LOGGING
// ======================================================

const createSettingsSnapshot = (settings) => ({
  commissionRate: settings.commissionRate,
  autoApproveProducts: settings.autoApproveProducts,
  codMaxOrderAmount: settings.codMaxOrderAmount,
  maxRefusedCodAllowed: settings.maxRefusedCodAllowed,
  payoutHoldDays: settings.payoutHoldDays,

  masterBrands: (settings.masterBrands || []).map(
    (brandId) => brandId.toString()
  ),
});

// ======================================================
// SETTINGS RESPONSE
// ======================================================

const buildSettingsResponse = async (settings) => {
  await settings.populate([
    {
      path: "masterBrands",
      select: "name slug isVerified isActive isGeneric",
    },
    {
      path: "updatedBy",
      select: "name email",
    },
  ]);

  return {
    _id: settings._id,
    commissionRate: settings.commissionRate,
    autoApproveProducts: settings.autoApproveProducts,
    codMaxOrderAmount: settings.codMaxOrderAmount,
    maxRefusedCodAllowed: settings.maxRefusedCodAllowed,
    payoutHoldDays: settings.payoutHoldDays,
    masterBrands: settings.masterBrands.filter(Boolean),
    updatedBy: settings.updatedBy,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
};

// ======================================================
// VALIDATE AND NORMALIZE SETTINGS UPDATE
// ======================================================

const normalizeSettingsUpdate = async (body, session) => {
  const updates = {};

  // ----------------------------------------------
  // COMMISSION RATE
  // ----------------------------------------------

  if (
    Object.prototype.hasOwnProperty.call(
      body,
      "commissionRate"
    )
  ) {
    const value = body.commissionRate;

    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 100 ||
      Math.abs(value * 100 - Math.round(value * 100)) >= 1e-8
    ) {
      throw new HttpError(
        400,
        "Commission rate must be a number from 0 to 100, with at most two decimal places."
      );
    }

    updates.commissionRate = value;
  }

  // ----------------------------------------------
  // AUTOMATIC PRODUCT APPROVAL
  // ----------------------------------------------

  if (
    Object.prototype.hasOwnProperty.call(
      body,
      "autoApproveProducts"
    )
  ) {
    if (typeof body.autoApproveProducts !== "boolean") {
      throw new HttpError(
        400,
        "autoApproveProducts must be true or false."
      );
    }

    updates.autoApproveProducts = body.autoApproveProducts;
  }

  // ----------------------------------------------
  // COD MAXIMUM ORDER AMOUNT
  // ----------------------------------------------

  if (
    Object.prototype.hasOwnProperty.call(
      body,
      "codMaxOrderAmount"
    )
  ) {
    const value = body.codMaxOrderAmount;

    if (
      !Number.isSafeInteger(value) ||
      value < 1
    ) {
      throw new HttpError(
        400,
        "COD maximum order amount must be a positive whole number in BDT."
      );
    }

    updates.codMaxOrderAmount = value;
  }

  // ----------------------------------------------
  // MAXIMUM REFUSED COD ORDERS
  // ----------------------------------------------

  if (
    Object.prototype.hasOwnProperty.call(
      body,
      "maxRefusedCodAllowed"
    )
  ) {
    const value = body.maxRefusedCodAllowed;

    if (
      !Number.isSafeInteger(value) ||
      value < 1 ||
      value > 100
    ) {
      throw new HttpError(
        400,
        "Maximum refused COD orders must be a whole number between 1 and 100."
      );
    }

    updates.maxRefusedCodAllowed = value;
  }

  // ----------------------------------------------
  // PAYOUT HOLD PERIOD
  // ----------------------------------------------

  if (
    Object.prototype.hasOwnProperty.call(
      body,
      "payoutHoldDays"
    )
  ) {
    const value = body.payoutHoldDays;

    if (
      !Number.isSafeInteger(value) ||
      value < 0 ||
      value > 365
    ) {
      throw new HttpError(
        400,
        "Payout hold days must be a whole number between 0 and 365."
      );
    }

    updates.payoutHoldDays = value;
  }

  // ----------------------------------------------
  // MASTER BRANDS
  // Accepts an array of existing Brand IDs.
  // ----------------------------------------------

  if (
    Object.prototype.hasOwnProperty.call(
      body,
      "masterBrands"
    )
  ) {
    if (!Array.isArray(body.masterBrands)) {
      throw new HttpError(
        400,
        "masterBrands must be an array of Brand IDs."
      );
    }

    if (body.masterBrands.length > 500) {
      throw new HttpError(
        400,
        "A maximum of 500 master brands is allowed."
      );
    }

    const brandIds = body.masterBrands.map((id) => {
      if (
        typeof id !== "string" ||
        !mongoose.isValidObjectId(id)
      ) {
        throw new HttpError(
          400,
          "Every master brand must contain a valid Brand ID."
        );
      }

      return new mongoose.Types.ObjectId(id);
    });

    const normalizedIds = brandIds.map((id) =>
      id.toString()
    );

    if (
      new Set(normalizedIds).size !==
      normalizedIds.length
    ) {
      throw new HttpError(
        400,
        "Duplicate master Brand IDs are not allowed."
      );
    }

    if (brandIds.length > 0) {
      let brandQuery = Brand.find({
        _id: {
          $in: brandIds,
        },
        isActive: true,
      }).select("_id");

      if (session) {
        brandQuery = brandQuery.session(session);
      }

      const activeBrands = await brandQuery.lean();

      if (activeBrands.length !== brandIds.length) {
        throw new HttpError(
          400,
          "One or more selected brands do not exist or are inactive."
        );
      }
    }

    updates.masterBrands = brandIds;
  }

  return updates;
};

// ======================================================
// GET PLATFORM SETTINGS
// GET /api/admin/platform-settings
// ======================================================

const getPlatformSettings = async (req, res) => {
  try {
    if (!ensureSuperAdmin(req, res)) {
      return;
    }

    const settings = await getOrCreatePlatformSettings();

    const response = await buildSettingsResponse(settings);

    return res.status(200).json({
      message: "Platform settings retrieved successfully.",
      settings: response,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to retrieve platform settings."
    );
  }
};

// ======================================================
// UPDATE PLATFORM SETTINGS
// PATCH /api/admin/platform-settings
// ======================================================

const updatePlatformSettings = async (req, res) => {
  let session;

  try {
    if (!ensureSuperAdmin(req, res)) {
      return;
    }

    const body = req.body || {};

    if (
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      throw new HttpError(
        400,
        "A valid JSON object is required."
      );
    }

    // Reject unsupported fields.
    const unsupportedFields = Object.keys(body).filter(
      (field) => !ALLOWED_BODY_FIELDS.includes(field)
    );

    if (unsupportedFields.length > 0) {
      throw new HttpError(
        400,
        `Unsupported platform setting fields: ${unsupportedFields.join(", ")}`
      );
    }

    const providedSettingsFields = SETTINGS_FIELDS.filter(
      (field) =>
        Object.prototype.hasOwnProperty.call(body, field)
    );

    if (providedSettingsFields.length === 0) {
      throw new HttpError(
        400,
        "At least one platform setting must be provided."
      );
    }

    // A note is required for every platform configuration change.
    if (
      typeof body.note !== "string" ||
      body.note.trim().length < 3 ||
      body.note.trim().length > 500
    ) {
      throw new HttpError(
        400,
        "An internal note between 3 and 500 characters is required."
      );
    }

    const note = body.note.trim();

    session = await mongoose.startSession();

    let updatedSettingsId = null;

    await session.withTransaction(async () => {
      const settings = await getOrCreatePlatformSettings({
        session,
      });

      const before = createSettingsSnapshot(settings);

      const updates = await normalizeSettingsUpdate(
        body,
        session
      );

      settings.set(updates);

      const after = createSettingsSnapshot(settings);

      if (
        JSON.stringify(before) ===
        JSON.stringify(after)
      ) {
        throw new HttpError(
          400,
          "No changes were detected in the submitted platform settings."
        );
      }

      settings.updatedBy = req.user._id;

      await settings.save({ session });

      await writeAuditLog({
        adminId: req.user._id,
        action: "PLATFORM_SETTINGS_UPDATED",
        targetType: "PlatformSettings",
        targetId: settings._id,
        changes: {
          before,
          after,
        },
        note,
        session,
      });

      updatedSettingsId = settings._id;
    });

    const updatedSettings = await PlatformSettings.findById(
      updatedSettingsId
    );

    if (!updatedSettings) {
      throw new HttpError(
        500,
        "Updated platform settings could not be retrieved."
      );
    }

    const response = await buildSettingsResponse(
      updatedSettings
    );

    return res.status(200).json({
      message: "Platform settings updated successfully.",
      settings: response,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to update platform settings."
    );
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  getPlatformSettings,
  updatePlatformSettings,
};