const mongoose = require("mongoose");

const compatibilityDeviceSchema =
  new mongoose.Schema(
    {
      deviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Device",
        required: true,
      },

      level: {
        type: String,
        enum: ["full", "partial"],
        default: "full",
        required: true,
      },

      notes: {
        type: String,
        trim: true,
        maxlength: 300,
        default: "",
      },
    },
    {
      _id: false,
    }
  );

const productCompatibilitySchema =
  new mongoose.Schema(
    {
      mode: {
        type: String,
        enum: [
          "not_applicable",
          "universal",
          "specific",
        ],
        default: "not_applicable",
        required: true,
      },

      devices: {
        type: [compatibilityDeviceSchema],
        default: [],
      },

      notes: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },
    },
    {
      _id: false,
    }
  );

productCompatibilitySchema.pre(
  "validate",
  function () {
    const devices = Array.isArray(this.devices)
      ? this.devices
      : [];

    const mode = this.mode || "not_applicable";

    if (
      mode === "specific" &&
      devices.length === 0
    ) {
      this.invalidate(
        "devices",
        "Specific compatibility requires at least one compatible device."
      );
    }

    if (
      mode !== "specific" &&
      devices.length > 0
    ) {
      this.invalidate(
        "devices",
        "Device entries are only allowed for specific compatibility."
      );
    }

    const ids = devices
      .map((item) => item.deviceId?.toString())
      .filter(Boolean);

    if (new Set(ids).size !== ids.length) {
      this.invalidate(
        "devices",
        "A device cannot be listed more than once."
      );
    }
  }
);

module.exports = productCompatibilitySchema;