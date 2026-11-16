
const mongoose = require("mongoose");

function createSlug(value) {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    logo: {
      type: String,
      trim: true,
      default: "",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isGeneric: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Normalize the name and generate the slug.
brandSchema.pre("validate", function () {
  if (this.name) {
    this.name = this.name.trim();
  }

  if (this.slug) {
    this.slug = createSlug(this.slug);
  } else if (this.name) {
    this.slug = createSlug(this.name);
  }
});

// Indexes
brandSchema.index({ name: 1 });
brandSchema.index({ slug: 1 }, { unique: true });

module.exports =
  mongoose.models.Brand ||
  mongoose.model("Brand", brandSchema);
