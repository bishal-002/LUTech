const sanitizeHtml = require("sanitize-html");

// ======================================================
// VALIDATION ERROR
// ======================================================

class ProductValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = "ProductValidationError";
    this.statusCode = 400;
    this.errors = errors.length ? errors : [message];
  }
}

const isPlainObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

const hasValue = (value) =>
  value !== undefined &&
  value !== null &&
  value !== "";

// ======================================================
// GTIN CHECKSUM VALIDATION
// Supports GTIN-8, UPC-A/GTIN-12, EAN-13, GTIN-14.
// ======================================================

const validateGtinChecksum = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const gtin = value.trim();

  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(gtin)) {
    return false;
  }

  let sum = 0;
  let weight = 3;

  // Exclude the final check digit and work right-to-left.
  for (let index = gtin.length - 2; index >= 0; index -= 1) {
    sum += Number(gtin[index]) * weight;
    weight = weight === 3 ? 1 : 3;
  }

  const expectedCheckDigit = (10 - (sum % 10)) % 10;
  const actualCheckDigit = Number(gtin[gtin.length - 1]);

  return expectedCheckDigit === actualCheckDigit;
};

const normalizeGtin = (value) => {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  if (typeof value !== "string") {
    throw new ProductValidationError(
      "GTIN must be submitted as a string so leading zeroes are preserved."
    );
  }

  const gtin = value.trim();

  if (!gtin) {
    return "";
  }

  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(gtin)) {
    throw new ProductValidationError(
      "GTIN must contain exactly 8, 12, 13, or 14 digits."
    );
  }

  if (!validateGtinChecksum(gtin)) {
    throw new ProductValidationError(
      "GTIN checksum is invalid. Check the final check digit."
    );
  }

  return gtin;
};

// ======================================================
// PRODUCT DESCRIPTION SANITIZATION
// Descriptions are stored as plain text in the current UI.
// All HTML markup is removed before saving.
// ======================================================

const decodeBasicHtmlEntities = (value) => {
  const namedEntities = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return value.replace(
    /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
    (match, entity) => {
      if (entity[0] !== "#") {
        return namedEntities[entity.toLowerCase()] ?? match;
      }

      try {
        const isHex = entity[1].toLowerCase() === "x";
        const codePoint = isHex
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);

        if (
          !Number.isInteger(codePoint) ||
          codePoint < 0 ||
          codePoint > 0x10ffff
        ) {
          return "";
        }

        return String.fromCodePoint(codePoint);
      } catch {
        return "";
      }
    }
  );
};

const sanitizeProductDescription = (value) => {
  if (typeof value !== "string") {
    throw new ProductValidationError(
      "Product description must be text."
    );
  }

  // Preserve paragraph and line breaks as plain-text newlines.
  const prepared = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote)\s*>/gi, "\n");

  // No HTML tags, attributes, scripts, styles or embedded content
  // are allowed in a product description.
  const sanitized = sanitizeHtml(prepared, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
    nonTextTags: [
      "style",
      "script",
      "textarea",
      "option",
    ],
  });

  return decodeBasicHtmlEntities(sanitized)
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

// ======================================================
// CATEGORY SPECIFICATION TEMPLATE VALIDATION
// ======================================================

const SPECIFICATION_INPUT_TYPES = [
  "text",
  "number",
  "boolean",
  "select",
  "multiselect",
];

const validateSpecificationTemplate = (template) => {
  if (!Array.isArray(template)) {
    throw new ProductValidationError(
      "Specification template must be an array."
    );
  }

  if (template.length > 100) {
    throw new ProductValidationError(
      "A category can have a maximum of 100 specification fields."
    );
  }

  const errors = [];
  const normalizedTemplate = [];
  const usedKeys = new Set();

  template.forEach((item, index) => {
    if (!isPlainObject(item)) {
      errors.push(
        `Specification template item ${index + 1} must be an object.`
      );
      return;
    }

    const group =
      typeof item.group === "string"
        ? item.group.trim()
        : "";

    const key =
      typeof item.key === "string"
        ? item.key.trim()
        : "";

    const label =
      typeof item.label === "string"
        ? item.label.trim()
        : "";

    const inputType = item.inputType || "text";

    if (!group || group.length > 60) {
      errors.push(
        `Specification field ${index + 1}: group must contain 1–60 characters.`
      );
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,59}$/.test(key)) {
      errors.push(
        `Specification field ${index + 1}: key must start with a letter and contain only letters, numbers, underscores or hyphens.`
      );
    }

    if (!label || label.length > 80) {
      errors.push(
        `Specification field ${index + 1}: label must contain 1–80 characters.`
      );
    }

    if (!SPECIFICATION_INPUT_TYPES.includes(inputType)) {
      errors.push(
        `Specification field ${index + 1}: invalid inputType.`
      );
    }

    const normalizedKey = key.toLowerCase();

    if (normalizedKey && usedKeys.has(normalizedKey)) {
      errors.push(
        `Duplicate specification key: ${key}.`
      );
    }

    if (normalizedKey) {
      usedKeys.add(normalizedKey);
    }

    const options = Array.isArray(item.options)
      ? item.options.map((option) =>
          typeof option === "string" ? option.trim() : ""
        )
      : [];

    if (
      options.some(
        (option) => !option || option.length > 100
      )
    ) {
      errors.push(
        `Specification field ${key || index + 1}: every option must contain 1–100 characters.`
      );
    }

    if (
      new Set(options.map((option) => option.toLowerCase()))
        .size !== options.length
    ) {
      errors.push(
        `Specification field ${key || index + 1}: duplicate options are not allowed.`
      );
    }

    if (
      ["select", "multiselect"].includes(inputType) &&
      options.length === 0
    ) {
      errors.push(
        `Specification field ${key || index + 1}: select and multiselect fields need at least one option.`
      );
    }

    if (
      !["select", "multiselect"].includes(inputType) &&
      options.length > 0
    ) {
      errors.push(
        `Specification field ${key || index + 1}: options are only allowed for select and multiselect fields.`
      );
    }

    const unit =
      typeof item.unit === "string"
        ? item.unit.trim()
        : "";

    if (unit.length > 20) {
      errors.push(
        `Specification field ${key || index + 1}: unit cannot exceed 20 characters.`
      );
    }

    if (
      item.required !== undefined &&
      typeof item.required !== "boolean"
    ) {
      errors.push(
        `Specification field ${key || index + 1}: required must be boolean.`
      );
    }

    if (
      item.filterable !== undefined &&
      typeof item.filterable !== "boolean"
    ) {
      errors.push(
        `Specification field ${key || index + 1}: filterable must be boolean.`
      );
    }

    const displayOrder = item.displayOrder ?? 0;

    if (
      !Number.isInteger(displayOrder) ||
      displayOrder < 0
    ) {
      errors.push(
        `Specification field ${key || index + 1}: displayOrder must be a non-negative integer.`
      );
    }

    normalizedTemplate.push({
      group,
      key,
      label,
      inputType,
      options,
      unit,
      required: item.required === true,
      filterable: item.filterable === true,
      displayOrder,
    });
  });

  if (errors.length > 0) {
    throw new ProductValidationError(
      "Category specification template validation failed.",
      errors
    );
  }

  return normalizedTemplate;
};

// ======================================================
// CATEGORY-SPECIFIC PRODUCT SPECIFICATION VALIDATION
// ======================================================

const validateCategorySpecifications = (
  category,
  specifications
) => {
  if (!Array.isArray(specifications)) {
    throw new ProductValidationError(
      "Product specifications must be an array."
    );
  }

  if (specifications.length > 100) {
    throw new ProductValidationError(
      "A product can contain a maximum of 100 specifications."
    );
  }

  const template = category?.specificationTemplate || [];

  if (template.length === 0) {
    if (specifications.length > 0) {
      throw new ProductValidationError(
        "This category has no specification template. Configure its specification fields before submitting product specifications."
      );
    }

    return [];
  }

  const templateByKey = new Map(
    template.map((field) => [
      String(field.key).toLowerCase(),
      field,
    ])
  );

  const submittedByKey = new Map();
  const errors = [];

  specifications.forEach((specification, index) => {
    if (!isPlainObject(specification)) {
      errors.push(
        `Specification ${index + 1} must be an object.`
      );
      return;
    }

    const key =
      typeof specification.key === "string"
        ? specification.key.trim()
        : "";

    if (!key) {
      errors.push(
        `Specification ${index + 1} is missing its key.`
      );
      return;
    }

    const normalizedKey = key.toLowerCase();

    if (submittedByKey.has(normalizedKey)) {
      errors.push(
        `Duplicate product specification: ${key}.`
      );
      return;
    }

    submittedByKey.set(normalizedKey, specification);

    if (!templateByKey.has(normalizedKey)) {
      errors.push(
        `Specification "${key}" is not allowed for category "${category.name}".`
      );
    }
  });

  const normalizedSpecifications = [];

  for (const field of template) {
    const key = String(field.key).toLowerCase();
    const submitted = submittedByKey.get(key);

    const value = submitted?.value;
    const isEmpty =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);

    if (isEmpty) {
      if (field.required) {
        errors.push(
          `${field.label} is required for category "${category.name}".`
        );
      }

      continue;
    }

    let normalizedValue = value;

    switch (field.inputType) {
      case "text": {
        if (typeof value !== "string") {
          errors.push(`${field.label} must be text.`);
          continue;
        }

        normalizedValue = value.trim();

        if (!normalizedValue) {
          if (field.required) {
            errors.push(`${field.label} is required.`);
          }
          continue;
        }

        if (normalizedValue.length > 500) {
          errors.push(
            `${field.label} cannot exceed 500 characters.`
          );
          continue;
        }

        break;
      }

      case "number": {
        const numberValue =
          typeof value === "number"
            ? value
            : typeof value === "string" &&
                value.trim() !== ""
              ? Number(value)
              : Number.NaN;

        if (!Number.isFinite(numberValue)) {
          errors.push(`${field.label} must be a valid number.`);
          continue;
        }

        normalizedValue = numberValue;
        break;
      }

      case "boolean": {
        if (typeof value !== "boolean") {
          errors.push(
            `${field.label} must be true or false.`
          );
          continue;
        }

        normalizedValue = value;
        break;
      }

      case "select": {
        if (
          typeof value !== "string" ||
          !field.options.includes(value.trim())
        ) {
          errors.push(
            `${field.label} must match one of its configured options.`
          );
          continue;
        }

        normalizedValue = value.trim();
        break;
      }

      case "multiselect": {
        if (
          !Array.isArray(value) ||
          value.length === 0 ||
          !value.every(
            (option) =>
              typeof option === "string" &&
              field.options.includes(option.trim())
          )
        ) {
          errors.push(
            `${field.label} contains an invalid selection.`
          );
          continue;
        }

        normalizedValue = [
          ...new Set(value.map((option) => option.trim())),
        ];
        break;
      }

      default:
        errors.push(
          `${field.label} has an unsupported input type.`
        );
        continue;
    }

    // The backend supplies group and label from the template.
    // It never trusts the seller's submitted group or label.
    normalizedSpecifications.push({
      group: field.group,
      key: field.key,
      label: field.label,
      value: normalizedValue,
    });
  }

  if (errors.length > 0) {
    throw new ProductValidationError(
      "Category-specific specification validation failed.",
      errors
    );
  }

  return normalizedSpecifications.sort((a, b) => {
    const aOrder =
      template.find((field) => field.key === a.key)?.displayOrder || 0;

    const bOrder =
      template.find((field) => field.key === b.key)?.displayOrder || 0;

    return aOrder - bOrder;
  });
};

// ======================================================
// SHIPPING, WARRANTY AND DISPATCH VALIDATION
// ======================================================

const validateShippingAndWarranty = (
  product,
  {
    validateShipping = true,
    validateWarranty = true,
    validateDispatch = true,
  } = {}
) => {
  const errors = [];

  // ----------------------------------------------
  // SHIPPING
  // ----------------------------------------------

  if (validateShipping) {
    const shipping = product.shipping;

    if (!isPlainObject(shipping)) {
      errors.push("Shipping information is required.");
    } else {
      const weight = Number(shipping.weightGrams);

      if (
        !hasValue(shipping.weightGrams) ||
        !Number.isFinite(weight) ||
        weight <= 0 ||
        weight > 1000000
      ) {
        errors.push(
          "Shipping weight must be greater than 0 and cannot exceed 1,000,000 grams."
        );
      }

      const dimensions = shipping.dimensions || {};

      const dimensionValues = [
        dimensions.lengthCm,
        dimensions.widthCm,
        dimensions.heightCm,
      ];

      const hasAnyDimension = dimensionValues.some(hasValue);
      const hasAllDimensions = dimensionValues.every(hasValue);

      if (hasAnyDimension && !hasAllDimensions) {
        errors.push(
          "Provide all three shipping dimensions: length, width and height."
        );
      }

      if (hasAllDimensions) {
        const normalizedDimensions =
          dimensionValues.map(Number);

        if (
          normalizedDimensions.some(
            (value) =>
              !Number.isFinite(value) ||
              value <= 0 ||
              value > 10000
          )
        ) {
          errors.push(
            "Each shipping dimension must be greater than 0 and cannot exceed 10,000 cm."
          );
        }
      }
    }
  }

  // ----------------------------------------------
  // WARRANTY
  // ----------------------------------------------

  if (validateWarranty) {
    const allowedWarrantyTypes = [
      "Official Brand Warranty",
      "Seller / Shop Service Warranty",
      "Instant Replacement Only",
      "International Warranty",
      "No Warranty",
    ];

    const warrantyType =
      product.warrantyType || "No Warranty";

    const duration = product.warrantyDuration || {};
    const durationValue = duration.value;
    const durationUnit = duration.unit || "Months";
    const warrantyPolicy =
      typeof product.warrantyPolicy === "string"
        ? product.warrantyPolicy.trim()
        : "";

    if (!allowedWarrantyTypes.includes(warrantyType)) {
      errors.push("Select a valid warranty type.");
    } else if (warrantyType === "No Warranty") {
      if (hasValue(durationValue)) {
        errors.push(
          "A product with no warranty must not contain a warranty duration."
        );
      }

      if (durationUnit === "Lifetime") {
        errors.push(
          "Lifetime duration cannot be used when warranty type is No Warranty."
        );
      }

      if (warrantyPolicy) {
        errors.push(
          "Remove the warranty policy when No Warranty is selected."
        );
      }
    } else {
      const allowedUnits = [
        "Days",
        "Months",
        "Years",
        "Lifetime",
      ];

      if (!allowedUnits.includes(durationUnit)) {
        errors.push("Select a valid warranty duration unit.");
      } else if (durationUnit === "Lifetime") {
        if (hasValue(durationValue)) {
          errors.push(
            "Lifetime warranty must not contain a numeric duration."
          );
        }
      } else {
        const numericDuration = Number(durationValue);

        if (
          !Number.isInteger(numericDuration) ||
          numericDuration < 1 ||
          numericDuration > 10000
        ) {
          errors.push(
            "Warranty duration must be a whole number between 1 and 10,000."
          );
        }
      }

      if (
        warrantyPolicy.length < 10 ||
        warrantyPolicy.length > 300
      ) {
        errors.push(
          "Warranty policy must contain 10–300 characters when a warranty is offered."
        );
      }
    }
  }

  // ----------------------------------------------
  // DISPATCH AND PRE-ORDER
  // ----------------------------------------------

  if (validateDispatch) {
    const allowedDispatchTimes = [
      "Same-Day Dispatch (Orders before 3 PM)",
      "1–2 Business Days",
      "3–5 Business Days",
      "Pre-Order",
    ];

    const dispatchTime =
      product.dispatchTime || "1–2 Business Days";

    if (!allowedDispatchTimes.includes(dispatchTime)) {
      errors.push("Select a valid dispatch time.");
    } else if (dispatchTime === "Pre-Order") {
      const releaseDate = product.preorderReleaseDate
        ? new Date(product.preorderReleaseDate)
        : null;

      if (
        !releaseDate ||
        Number.isNaN(releaseDate.getTime())
      ) {
        errors.push(
          "A valid release date is required for pre-order products."
        );
      } else if (releaseDate.getTime() <= Date.now()) {
        errors.push(
          "Pre-order release date must be in the future."
        );
      }
    }
  }

  return errors;
};

// ======================================================
// PRODUCT IMAGE VALIDATION
// ======================================================

const validateProductImages = (images) => {
  if (!Array.isArray(images)) {
    throw new ProductValidationError(
      "Product images must be an array."
    );
  }

  if (images.length < 2 || images.length > 10) {
    throw new ProductValidationError(
      "A product must have between 2 and 10 images."
    );
  }

  const allowedSlots = [
    "main",
    "ports",
    "packaging",
    "scale",
    "extra",
  ];

  const mainCount = images.filter(
    (image) => image?.slot === "main"
  ).length;

  const portsCount = images.filter(
    (image) => image?.slot === "ports"
  ).length;

  if (mainCount !== 1 || portsCount !== 1) {
    throw new ProductValidationError(
      "A product must contain exactly one main image and one ports image."
    );
  }

  for (const [index, image] of images.entries()) {
    if (!isPlainObject(image)) {
      throw new ProductValidationError(
        `Image ${index + 1} must be an object.`
      );
    }

    if (!allowedSlots.includes(image.slot)) {
      throw new ProductValidationError(
        `Image ${index + 1} has an invalid slot.`
      );
    }

    if (typeof image.url !== "string" || image.url.length > 2048) {
      throw new ProductValidationError(
        `Image ${index + 1} must contain a valid URL.`
      );
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(image.url);
    } catch {
      throw new ProductValidationError(
        `Image ${index + 1} URL is invalid.`
      );
    }

    if (
      !["http:", "https:"].includes(parsedUrl.protocol) ||
      parsedUrl.username ||
      parsedUrl.password
    ) {
      throw new ProductValidationError(
        `Image ${index + 1} must use a valid HTTP or HTTPS URL.`
      );
    }
  }
};

// ======================================================
// VIDEO URL VALIDATION
// Actual uploaded video files are signature-checked by
// productStorageService before they are stored.
// ======================================================

const validateVideoUrl = (videoUrl) => {
  if (!hasValue(videoUrl)) {
    return "";
  }

  if (
    typeof videoUrl !== "string" ||
    videoUrl.length > 2048
  ) {
    throw new ProductValidationError(
      "Video URL must be valid text and cannot exceed 2,048 characters."
    );
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(videoUrl);
  } catch {
    throw new ProductValidationError(
      "Video URL is invalid."
    );
  }

  if (
    !["http:", "https:"].includes(parsedUrl.protocol) ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    throw new ProductValidationError(
      "Video URL must use HTTP or HTTPS."
    );
  }

  return videoUrl.trim();
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  ProductValidationError,
  isPlainObject,
  validateGtinChecksum,
  normalizeGtin,
  sanitizeProductDescription,
  validateSpecificationTemplate,
  validateCategorySpecifications,
  validateShippingAndWarranty,
  validateProductImages,
  validateVideoUrl,
};