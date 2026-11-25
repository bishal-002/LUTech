const mongoose = require("mongoose");

const DEVICE_TYPES = [
  "smartphone",
  "tablet",
  "laptop",
  "desktop",
  "smartwatch",
  "gaming_console",
  "television",
  "camera",
  "audio_device",
  "printer",
  "router",
  "other",
];

const createSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const deviceSchema = new mongoose.Schema(
  {
    deviceType: {
      type: String,
      enum: DEVICE_TYPES,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    brand: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    model: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    modelNumber: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 80,
      default: "",
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 180,
    },

    aliases: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 100,
        },
      ],
      default: [],
      validate: {
        validator: (items) =>
          Array.isArray(items) && items.length <= 20,
        message:
          "A device can have a maximum of 20 search aliases.",
      },
    },

    releaseYear: {
      type: Number,
      min: 1970,
      max: 2100,
      default: null,
      validate: {
        validator: (value) =>
          value === null ||
          value === undefined ||
          Number.isInteger(value),
        message: "Release year must be a whole number.",
      },
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

deviceSchema.pre("validate", function () {
  if (this.brand) {
    this.brand = this.brand.trim();
  }

  if (this.model) {
    this.model = this.model.trim();
  }

  if (this.modelNumber) {
    this.modelNumber = this.modelNumber
      .trim()
      .toUpperCase();
  }

  if (
    this.isNew ||
    this.isModified("deviceType") ||
    this.isModified("brand") ||
    this.isModified("model") ||
    this.isModified("modelNumber") ||
    !this.slug
  ) {
    this.slug = createSlug(
      [
        this.deviceType,
        this.brand,
        this.model,
        this.modelNumber,
      ]
        .filter(Boolean)
        .join("-")
    );
  } else if (this.slug) {
    this.slug = createSlug(this.slug);
  }

  if (Array.isArray(this.aliases)) {
    const normalized = this.aliases
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    this.aliases = [
      ...new Map(
        normalized.map((item) => [
          item.toLowerCase(),
          item,
        ])
      ).values(),
    ];
  }
});

deviceSchema.index({
  deviceType: 1,
  brand: 1,
  model: 1,
});

deviceSchema.index({
  isActive: 1,
  deviceType: 1,
  brand: 1,
});

deviceSchema.index({
  brand: "text",
  model: "text",
  modelNumber: "text",
  aliases: "text",
});

module.exports =
  mongoose.models.Device ||
  mongoose.model("Device", deviceSchema);