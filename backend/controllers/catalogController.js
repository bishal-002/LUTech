const mongoose = require("mongoose");
const Brand = require("../models/Brand");
const Category = require("../models/Category");

// ======================================================
// HELPERS
// ======================================================

const isValidId = (id) => mongoose.isValidObjectId(id);

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object, key);

const createSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const handleCatalogError = (res, error) => {
  console.error("Catalog Controller Error:", error);

  if (error.code === 11000) {
    return res.status(409).json({
      message: "A record with this name or slug already exists.",
    });
  }

  if (
    error.name === "ValidationError" ||
    error.name === "CastError" ||
    error.name === "BSONError"
  ) {
    return res.status(400).json({
      message: error.message,
    });
  }

  return res.status(500).json({
    message: "Unable to process catalog request.",
  });
};

const validateStringFields = (body, fields, res) => {
  for (const [field, maxLength] of Object.entries(fields)) {
    if (
      body[field] !== undefined &&
      (
        typeof body[field] !== "string" ||
        body[field].trim().length > maxLength
      )
    ) {
      res.status(400).json({
        message: `${field} must be valid text with a maximum of ${maxLength} characters.`,
      });

      return false;
    }
  }

  return true;
};

const validateBooleanFields = (body, fields, res) => {
  for (const field of fields) {
    if (
      body[field] !== undefined &&
      typeof body[field] !== "boolean"
    ) {
      res.status(400).json({
        message: `${field} must be true or false.`,
      });

      return false;
    }
  }

  return true;
};

// ======================================================
// BRAND: PUBLIC
// ======================================================

const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find({
      isActive: true,
    })
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      count: brands.length,
      brands,
    });
  } catch (error) {
    return handleCatalogError(res, error);
  }
};

const getBrandById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid brand ID.",
      });
    }

    const brand = await Brand.findOne({
      _id: req.params.id,
      isActive: true,
    }).lean();

    if (!brand) {
      return res.status(404).json({
        message: "Brand not found.",
      });
    }

    return res.status(200).json({ brand });
  } catch (error) {
    return handleCatalogError(res, error);
  }
};

// ======================================================
// BRAND: ADMIN
// ======================================================

const getAllBrandsAdmin = async (req, res) => {
  try {
    const brands = await Brand.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      count: brands.length,
      brands,
    });
  } catch (error) {
    return handleCatalogError(res, error);
  }
};

const createBrand = async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      logo,
      isVerified,
      isActive,
      isGeneric,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        message: "Brand name is required.",
      });
    }

    if (
      !validateStringFields(
        req.body,
        {
          slug: 100,
          description: 500,
          logo: 2048,
        },
        res
      ) ||
      !validateBooleanFields(
        req.body,
        ["isVerified", "isActive", "isGeneric"],
        res
      )
    ) {
      return;
    }

    const brandData = {
      name: name.trim(),
    };

    if (slug !== undefined && slug.trim()) {
      brandData.slug = slug.trim();
    }

    if (description !== undefined) {
      brandData.description = description.trim();
    }

    if (logo !== undefined) {
      brandData.logo = logo.trim();
    }

    if (isVerified !== undefined) {
      brandData.isVerified = isVerified;
    }

    if (isActive !== undefined) {
      brandData.isActive = isActive;
    }

    if (isGeneric !== undefined) {
      brandData.isGeneric = isGeneric;
    }

    const brand = await Brand.create(brandData);

    return res.status(201).json({
      message: "Brand created successfully.",
      brand,
    });
  } catch (error) {
    return handleCatalogError(res, error);
  }
};

const updateBrand = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid brand ID.",
      });
    }

    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        message: "Brand not found.",
      });
    }

    const stringFields = {
      name: 80,
      slug: 100,
      description: 500,
      logo: 2048,
    };

    if (
      !validateStringFields(req.body, stringFields, res) ||
      !validateBooleanFields(
        req.body,
        ["isVerified", "isActive", "isGeneric"],
        res
      )
    ) {
      return;
    }

    const allowedFields = [
      "name",
      "slug",
      "description",
      "logo",
      "isVerified",
      "isActive",
      "isGeneric",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (hasOwn(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid brand fields provided.",
      });
    }

    if (updates.name !== undefined) {
      updates.name = updates.name.trim();

      if (!updates.name) {
        return res.status(400).json({
          message: "Brand name cannot be empty.",
        });
      }

      if (updates.slug === undefined) {
        updates.slug = createSlug(updates.name);
      }
    }

    if (updates.slug !== undefined) {
      updates.slug = updates.slug.trim();

      if (!updates.slug) {
        return res.status(400).json({
          message: "Brand slug cannot be empty.",
        });
      }
    }

    if (updates.description !== undefined) {
      updates.description = updates.description.trim();
    }

    if (updates.logo !== undefined) {
      updates.logo = updates.logo.trim();
    }

    brand.set(updates);

    await brand.save();

    return res.status(200).json({
      message: "Brand updated successfully.",
      brand,
    });
  } catch (error) {
    return handleCatalogError(res, error);
  }
};

const deactivateBrand = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid brand ID.",
      });
    }

    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        message: "Brand not found.",
      });
    }

    brand.isActive = false;
    await brand.save();

    return res.status(200).json({
      message: "Brand deactivated successfully.",
    });
  } catch (error) {
    return handleCatalogError(res, error);
  }
};

// ======================================================
// CATEGORY: PUBLIC
// ======================================================

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      isActive: true,
    })
      .populate("parentCategory", "name slug")
      .sort({ level: 1, sortOrder: 1, name: 1 })
      .lean();

    return res.status(200).json({
      count: categories.length,
      categories,
    });
  } catch (error) {
    return handleCatalogError(res, error);
  }
};

const getCategoryById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid category ID.",
      });
    }

    const category = await Category.findOne({
      _id: req.params.id,
      isActive: true,
    })
      .populate("parentCategory", "name slug")
      .lean();

    if (!category) {
      return res.status(404).json({
        message: "Category not found.",
      });
    }

    return res.status(200).json({ category });
  } catch (error) {
    return handleCatalogError(res, error);
  }
};

// ======================================================
// CATEGORY: ADMIN
// ======================================================

const getAllCategoriesAdmin = async (req, res) => {
  try {
    const categories = await Category.find()
      .populate("parentCategory", "name slug")
      .sort({ level: 1, sortOrder: 1, name: 1 })
      .lean();

    return res.status(200).json({
      count: categories.length,
      categories,
    });
  } catch (error) {
    return handleCatalogError(res, error);
  }
};

const createCategory = async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      parentCategory,
      image,
      specificationTemplate,
      isActive,
      sortOrder,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        message: "Category name is required.",
      });
    }

    if (
      !validateStringFields(
        req.body,
        {
          slug: 100,
          description: 500,
          image: 2048,
        },
        res
      ) ||
      !validateBooleanFields(req.body, ["isActive"], res)
    ) {
      return;
    }

    if (
      sortOrder !== undefined &&
      (!Number.isInteger(sortOrder) || sortOrder < 0)
    ) {
      return res.status(400).json({
        message: "Sort order must be a non-negative integer.",
      });
    }

    if (
      specificationTemplate !== undefined &&
      !Array.isArray(specificationTemplate)
    ) {
      return res.status(400).json({
        message: "Specification template must be an array.",
      });
    }

    let parentId = null;

    if (parentCategory) {
      if (!isValidId(parentCategory)) {
        return res.status(400).json({
          message: "Invalid parent category ID.",
        });
      }

      const parent = await Category.findOne({
        _id: parentCategory,
        isActive: true,
      }).select("_id");

      if (!parent) {
        return res.status(400).json({
          message: "Parent category does not exist or is inactive.",
        });
      }

      parentId = parent._id;
    }

    const categoryData = {
      name: name.trim(),
      parentCategory: parentId,
    };

    if (slug !== undefined && slug.trim()) {
      categoryData.slug = slug.trim();
    }

    if (description !== undefined) {
      categoryData.description = description.trim();
    }

    if (image !== undefined) {
      categoryData.image = image.trim();
    }

    if (specificationTemplate !== undefined) {
      categoryData.specificationTemplate = specificationTemplate;
    }

    if (isActive !== undefined) {
      categoryData.isActive = isActive;
    }

    if (sortOrder !== undefined) {
      categoryData.sortOrder = sortOrder;
    }

    const category = await Category.create(categoryData);

    return res.status(201).json({
      message: "Category created successfully.",
      category,
    });
  } catch (error) {
    return handleCatalogError(res, error);
  }
};

const updateCategory = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid category ID.",
      });
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: "Category not found.",
      });
    }

    if (
      !validateStringFields(
        req.body,
        {
          name: 80,
          slug: 100,
          description: 500,
          image: 2048,
        },
        res
      ) ||
      !validateBooleanFields(req.body, ["isActive"], res)
    ) {
      return;
    }

    const allowedFields = [
      "name",
      "slug",
      "description",
      "image",
      "specificationTemplate",
      "isActive",
      "sortOrder",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (hasOwn(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (hasOwn(req.body, "parentCategory")) {
      const parentCategory = req.body.parentCategory;

      if (!parentCategory) {
        updates.parentCategory = null;
      } else {
        if (!isValidId(parentCategory)) {
          return res.status(400).json({
            message: "Invalid parent category ID.",
          });
        }

        if (parentCategory.toString() === category._id.toString()) {
          return res.status(400).json({
            message: "A category cannot be its own parent.",
          });
        }

        const parent = await Category.findOne({
          _id: parentCategory,
          isActive: true,
        }).select("_id");

        if (!parent) {
          return res.status(400).json({
            message: "Parent category does not exist or is inactive.",
          });
        }

        updates.parentCategory = parent._id;
      }
    }

    if (
      updates.sortOrder !== undefined &&
      (!Number.isInteger(updates.sortOrder) || updates.sortOrder < 0)
    ) {
      return res.status(400).json({
        message: "Sort order must be a non-negative integer.",
      });
    }

    if (
      updates.specificationTemplate !== undefined &&
      !Array.isArray(updates.specificationTemplate)
    ) {
      return res.status(400).json({
        message: "Specification template must be an array.",
      });
    }

    if (updates.name !== undefined) {
      updates.name = updates.name.trim();

      if (!updates.name) {
        return res.status(400).json({
          message: "Category name cannot be empty.",
        });
      }

      if (updates.slug === undefined) {
        updates.slug = createSlug(updates.name);
      }
    }

    if (updates.slug !== undefined) {
      updates.slug = updates.slug.trim();

      if (!updates.slug) {
        return res.status(400).json({
          message: "Category slug cannot be empty.",
        });
      }
    }

    if (updates.description !== undefined) {
      updates.description = updates.description.trim();
    }

    if (updates.image !== undefined) {
      updates.image = updates.image.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid category fields provided.",
      });
    }

    category.set(updates);

    await category.save();

    return res.status(200).json({
      message: "Category updated successfully.",
      category,
    });
  } catch (error) {
    return handleCatalogError(res, error);
  }
};

const deactivateCategory = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid category ID.",
      });
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: "Category not found.",
      });
    }

    const activeChildren = await Category.exists({
      parentCategory: category._id,
      isActive: true,
    });

    if (activeChildren) {
      return res.status(409).json({
        message: "Deactivate or reassign child categories first.",
      });
    }

    category.isActive = false;
    await category.save();

    return res.status(200).json({
      message: "Category deactivated successfully.",
    });
  } catch (error) {
    return handleCatalogError(res, error);
  }
};

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  getBrands,
  getBrandById,
  getAllBrandsAdmin,
  createBrand,
  updateBrand,
  deactivateBrand,
  getCategories,
  getCategoryById,
  getAllCategoriesAdmin,
  createCategory,
  updateCategory,
  deactivateCategory,
};