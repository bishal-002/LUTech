
const mongoose = require("mongoose");
const Device = require("../models/Device");

const MODES = [
  "not_applicable",
  "universal",
  "specific",
];

const LEVELS = [
  "full",
  "partial",
];

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(
    object,
    key
  );

const isPlainObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

// ======================================================
// COMPATIBILITY VALIDATION
// ======================================================

const makeValidator = ({
  standalone = false,
} = {}) => {
  return async (req, res, next) => {
    try {
      let payload;

      if (standalone) {
        // Dedicated compatibility update endpoint.
        payload = hasOwn(
          req.body || {},
          "compatibility"
        )
          ? req.body.compatibility
          : req.body;
      } else {
        // Product creation endpoint.
        if (
          !hasOwn(
            req.body || {},
            "compatibility"
          )
        ) {
          return next();
        }

        payload = req.body.compatibility;
      }

      if (!isPlainObject(payload)) {
        return res.status(400).json({
          message:
            "Compatibility must be a valid JSON object.",
        });
      }

      // ------------------------------------------------
      // VALIDATE MODE
      // ------------------------------------------------

      const mode =
        payload.mode || "not_applicable";

      if (!MODES.includes(mode)) {
        return res.status(400).json({
          message:
            "Compatibility mode must be not_applicable, universal or specific.",
        });
      }

      // ------------------------------------------------
      // VALIDATE GENERAL NOTES
      // ------------------------------------------------

      const generalNotes =
        payload.notes === undefined
          ? ""
          : payload.notes;

      if (
        typeof generalNotes !== "string" ||
        generalNotes.trim().length > 500
      ) {
        return res.status(400).json({
          message:
            "Compatibility notes must be text and cannot exceed 500 characters.",
        });
      }

      // ------------------------------------------------
      // VALIDATE DEVICE ARRAY
      // ------------------------------------------------

      const devices =
        payload.devices === undefined
          ? []
          : payload.devices;

      if (
        !Array.isArray(devices) ||
        devices.length > 100
      ) {
        return res.status(400).json({
          message:
            "Compatible devices must be an array containing no more than 100 entries.",
        });
      }

      if (
        mode === "specific" &&
        devices.length === 0
      ) {
        return res.status(400).json({
          message:
            "Specific compatibility requires at least one device.",
        });
      }

      if (
        mode !== "specific" &&
        devices.length > 0
      ) {
        return res.status(400).json({
          message:
            "Device entries are only allowed when compatibility mode is specific.",
        });
      }

      // ------------------------------------------------
      // NORMALIZE DEVICE ENTRIES
      // ------------------------------------------------

      const normalizedDevices = [];
      const deviceIds = [];
      const usedIds = new Set();

      for (
        const [index, item] of devices.entries()
      ) {
        if (
          !isPlainObject(item) ||
          !mongoose.isValidObjectId(item.deviceId)
        ) {
          return res.status(400).json({
            message:
              `Compatible device ${index + 1} must contain a valid deviceId.`,
          });
        }

        const deviceId = String(item.deviceId);

        if (usedIds.has(deviceId)) {
          return res.status(400).json({
            message:
              `Device ${deviceId} has been added more than once.`,
          });
        }

        usedIds.add(deviceId);

        const level = item.level || "full";

        if (!LEVELS.includes(level)) {
          return res.status(400).json({
            message:
              `Compatible device ${index + 1} has an invalid support level.`,
          });
        }

        const notes =
          item.notes === undefined
            ? ""
            : item.notes;

        if (
          typeof notes !== "string" ||
          notes.trim().length > 300
        ) {
          return res.status(400).json({
            message:
              `Compatible device ${index + 1} notes cannot exceed 300 characters.`,
          });
        }

        deviceIds.push(deviceId);

        normalizedDevices.push({
          deviceId,
          level,
          notes: notes.trim(),
        });
      }

      // ------------------------------------------------
      // VERIFY DEVICE RECORDS
      // ------------------------------------------------

      if (deviceIds.length > 0) {
        const activeDevices = await Device.find({
          _id: {
            $in: deviceIds,
          },
          isActive: true,
        })
          .select("_id")
          .lean();

        if (
          activeDevices.length !== deviceIds.length
        ) {
          return res.status(400).json({
            message:
              "One or more selected devices do not exist or are inactive.",
          });
        }
      }

      // ------------------------------------------------
      // STORE VALIDATED DATA
      // ------------------------------------------------

      req.compatibilityPayload = {
        mode,
        devices: normalizedDevices,
        notes: generalNotes.trim(),
      };

      if (!standalone) {
        req.body.compatibility =
          req.compatibilityPayload;
      }

      return next();
    } catch (error) {
      console.error(
        "Product compatibility validation error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to validate product compatibility.",
      });
    }
  };
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  validateCompatibilityOnCreate:
    makeValidator({
      standalone: false,
    }),

  validateCompatibilityOnUpdate:
    makeValidator({
      standalone: true,
    }),
};
