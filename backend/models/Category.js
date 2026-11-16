
const mongoose = require("mongoose");

function createSlug(value) {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const specificationTemplateSchema = new mongoose.Schema(
  {
    group: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },

    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },

    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    inputType: {
      type: String,
      enum: ["text", "number", "boolean", "select", "multiselect"],
      default: "text",
    },

    options: {
      type: [String],
      default: [],
    },

    unit: {
      type: String,
      trim: true,
      default: "",
    },

    required: {
      type: Boolean,
      default: false,
    },

    filterable: {
      type: Boolean,
      default: false,
    },

    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
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

    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    level: {
      type: Number,
      min: 1,
      max: 3,
      default: 1,
    },

    image: {
      type: String,
      trim: true,
      default: "",
    },

    specificationTemplate: {
      type: [specificationTemplateSchema],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Validate hierarchy and generate slug.
categorySchema.pre("validate", async function () {
  if (this.name) {
    this.name = this.name.trim();
  }

  if (this.slug) {
    this.slug = createSlug(this.slug);
  } else if (this.name) {
    this.slug = createSlug(this.name);
  }

  // Root category
  if (!this.parentCategory) {
    this.level = 1;
    return;
  }

  if (this.parentCategory.equals(this._id)) {
    throw new Error("A category cannot be its own parent.");
  }

  let currentParentId = this.parentCategory;
  let calculatedLevel = 1;
  const visitedIds = new Set([this._id.toString()]);

  // Walk up the hierarchy to validate depth and detect cycles.
  while (currentParentId) {
    const parentId = currentParentId.toString();

    if (visitedIds.has(parentId)) {
      throw new Error("Circular category hierarchy detected.");
    }

    visitedIds.add(parentId);

    const parent = await this.constructor.findById(currentParentId)
      .select("_id parentCategory")
      .lean();

    if (!parent) {
      throw new Error("Parent category does not exist.");
    }

    calculatedLevel += 1;

    if (calculatedLevel > 3) {
      throw new Error("Categories cannot exceed three levels.");
    }

    currentParentId = parent.parentCategory;
  }

  this.level = calculatedLevel;
});

// Indexes
categorySchema.index({ parentCategory: 1, isActive: 1 });
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 }, { unique: true });

module.exports =
  mongoose.models.Category ||
  mongoose.model("Category", categorySchema);
