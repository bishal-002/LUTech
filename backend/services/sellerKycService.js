const MAX_KYC_DOCUMENT_SIZE = 5 * 1024 * 1024;

const BUSINESS_TYPES = [
  "individual",
  "retail_shop",
  "company",
];

const SELLER_TYPES = [
  "standard_seller",
  "official_brand",
  "authorized_reseller",
  "verified_shop",
  "individual_seller",
];

const DOCUMENT_TYPES = [
  "nid_front",
  "nid_back",
  "trade_license",
  "authorization",
];

const DOCUMENT_FIELDS = Object.freeze({
  nid_front: "nidDocuments.front",
  nid_back: "nidDocuments.back",
  trade_license: "tradeLicenseDocument",
  authorization: "authorizationDocument",
});

const normalizeBdPhone = (phone) => {
  const value = String(phone || "").replace(/[\s()-]/g, "");

  if (/^01[3-9]\d{8}$/.test(value)) {
    return `+880${value.slice(1)}`;
  }

  if (/^\+8801[3-9]\d{8}$/.test(value)) {
    return value;
  }

  return "";
};

const isValidBdPhone = (phone) => Boolean(normalizeBdPhone(phone));

const isValidNidOrPassport = (value) => {
  if (typeof value !== "string") return false;

  const number = value.trim();

  const validNid = /^(\d{10}|\d{13}|\d{17})$/.test(number);
  const validPassport = /^[A-Za-z0-9]{6,20}$/.test(number);

  return validNid || validPassport;
};

const getKycDocument = (user, documentType) => {
  if (!DOCUMENT_TYPES.includes(documentType) || !user?.kyc) {
    return null;
  }

  switch (documentType) {
    case "nid_front":
      return user.kyc.nidDocuments?.front || null;

    case "nid_back":
      return user.kyc.nidDocuments?.back || null;

    case "trade_license":
      return user.kyc.tradeLicenseDocument || null;

    case "authorization":
      return user.kyc.authorizationDocument || null;

    default:
      return null;
  }
};

const sanitizeKycDocument = (document) => {
  if (!document) return null;

  return {
    originalName: document.originalName || "",
    mimeType: document.mimeType || "",
    sizeBytes: document.sizeBytes || 0,
    uploadedAt: document.uploadedAt || null,
    uploaded: Boolean(document.storageKey),
  };
};

const isValidDocument = (document, allowedMimeTypes) => {
  if (!document?.storageKey) return false;

  if (
    !Number.isFinite(Number(document.sizeBytes)) ||
    Number(document.sizeBytes) <= 0 ||
    Number(document.sizeBytes) > MAX_KYC_DOCUMENT_SIZE
  ) {
    return false;
  }

  if (!allowedMimeTypes.includes(document.mimeType)) {
    return false;
  }

  return true;
};

const validateSellerKyc = (user) => {
  const errors = [];
  const kyc = user?.kyc || {};
  const warehouse =
    user?.warehouseAddress ||
    kyc.warehouseAddress ||
    {};

  if (
    typeof user?.storeName !== "string" ||
    user.storeName.trim().length < 3 ||
    user.storeName.trim().length > 50
  ) {
    errors.push("Store name must contain 3–50 characters.");
  }

  if (
    typeof kyc.ownerName !== "string" ||
    kyc.ownerName.trim().length < 2 ||
    kyc.ownerName.trim().length > 120
  ) {
    errors.push("A valid account owner's legal name is required.");
  }

  if (!isValidBdPhone(kyc.ownerPhone)) {
    errors.push("A valid Bangladesh owner phone number is required.");
  }

  if (kyc.ownerPhoneVerified !== true) {
    errors.push("The owner's phone number must be OTP verified.");
  }

  if (!isValidNidOrPassport(kyc.nidNumber)) {
    errors.push(
      "Provide a valid 10, 13, or 17 digit NID or a valid passport number."
    );
  }

  const nidMimeTypes = [
    "image/jpeg",
    "image/png",
    "application/pdf",
  ];

  if (!isValidDocument(kyc.nidDocuments?.front, nidMimeTypes)) {
    errors.push("A valid NID/passport front document is required.");
  }

  if (!isValidDocument(kyc.nidDocuments?.back, nidMimeTypes)) {
    errors.push("A valid NID/passport back document is required.");
  }

  if (!BUSINESS_TYPES.includes(kyc.businessType)) {
    errors.push("Select a valid business type.");
  }

  if (!SELLER_TYPES.includes(kyc.requestedSellerType)) {
    errors.push("Select a valid requested seller type.");
  }

  if (
    ["retail_shop", "company"].includes(kyc.businessType) &&
    (
      typeof kyc.legalBusinessName !== "string" ||
      !kyc.legalBusinessName.trim()
    )
  ) {
    errors.push(
      "Legal business name is required for retail shops and companies."
    );
  }

  const requiresTradeLicense =
    kyc.requestedSellerType === "verified_shop" ||
    Boolean(String(kyc.tradeLicenseNumber || "").trim());

  if (requiresTradeLicense) {
    if (
      typeof kyc.tradeLicenseNumber !== "string" ||
      !kyc.tradeLicenseNumber.trim()
    ) {
      errors.push("Trade license number is required.");
    }

    if (
      !isValidDocument(
        kyc.tradeLicenseDocument,
        ["application/pdf", "image/jpeg"]
      )
    ) {
      errors.push(
        "A valid PDF or JPG trade license document is required."
      );
    }
  }

  if (
    ["official_brand", "authorized_reseller"].includes(
      kyc.requestedSellerType
    )
  ) {
    if (
      !isValidDocument(
        kyc.authorizationDocument,
        ["application/pdf"]
      )
    ) {
      errors.push(
        "A PDF brand authorization letter is required for this seller type."
      );
    }
  }

  if (
    typeof warehouse.street !== "string" ||
    !warehouse.street.trim()
  ) {
    errors.push("Warehouse street address is required.");
  }

  if (
    !String(warehouse.city || "").trim() &&
    !String(warehouse.district || "").trim()
  ) {
    errors.push("Warehouse city or district is required.");
  }

  if (
    typeof warehouse.postalCode !== "string" ||
    !warehouse.postalCode.trim()
  ) {
    errors.push("Warehouse postal code is required.");
  }

  if (
    typeof warehouse.contactPerson !== "string" ||
    !warehouse.contactPerson.trim()
  ) {
    errors.push("Warehouse contact person is required.");
  }

  if (!isValidBdPhone(warehouse.phone)) {
    errors.push("A valid warehouse contact phone number is required.");
  }

  return errors;
};

const validateApprovedSellerType = (sellerType, kyc) => {
  const errors = [];

  if (!SELLER_TYPES.includes(sellerType)) {
    return ["Invalid seller tier."];
  }

  if (
    sellerType === "verified_shop" &&
    (
      !kyc?.tradeLicenseNumber ||
      !isValidDocument(
        kyc.tradeLicenseDocument,
        ["application/pdf", "image/jpeg"]
      )
    )
  ) {
    errors.push(
      "A verified shop requires a valid trade license and document."
    );
  }

  if (
    ["official_brand", "authorized_reseller"].includes(sellerType) &&
    !isValidDocument(
      kyc?.authorizationDocument,
      ["application/pdf"]
    )
  ) {
    errors.push(
      "This seller tier requires a valid PDF authorization letter."
    );
  }

  return errors;
};

const buildSellerKycResponse = (user) => {
  const kyc = user.kyc || {};
  const warehouse =
    user.warehouseAddress ||
    kyc.warehouseAddress ||
    {};

  return {
    businessType: kyc.businessType || "individual",
    requestedSellerType:
      kyc.requestedSellerType || "standard_seller",

    ownerName: kyc.ownerName || "",
    ownerPhone: kyc.ownerPhone || "",
    ownerPhoneVerified: Boolean(kyc.ownerPhoneVerified),

    nidNumber: kyc.nidNumber || "",

    nidDocuments: {
      front: sanitizeKycDocument(kyc.nidDocuments?.front),
      back: sanitizeKycDocument(kyc.nidDocuments?.back),
    },

    legalBusinessName: kyc.legalBusinessName || "",
    tradeLicenseNumber: kyc.tradeLicenseNumber || "",

    tradeLicenseDocument: sanitizeKycDocument(
      kyc.tradeLicenseDocument
    ),

    tinNumber: kyc.tinNumber || "",
    binNumber: kyc.binNumber || "",

    authorizationDocument: sanitizeKycDocument(
      kyc.authorizationDocument
    ),

    warehouseAddress: {
      street: warehouse.street || "",
      city: warehouse.city || "",
      district: warehouse.district || "",
      postalCode: warehouse.postalCode || "",
      contactPerson: warehouse.contactPerson || "",
      phone: warehouse.phone || "",
    },

    submittedAt: kyc.submittedAt || null,
  };
};

module.exports = {
  MAX_KYC_DOCUMENT_SIZE,
  BUSINESS_TYPES,
  SELLER_TYPES,
  DOCUMENT_TYPES,
  DOCUMENT_FIELDS,
  normalizeBdPhone,
  isValidBdPhone,
  isValidNidOrPassport,
  getKycDocument,
  sanitizeKycDocument,
  validateSellerKyc,
  validateApprovedSellerType,
  buildSellerKycResponse,
};