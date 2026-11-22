const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const User = require("../models/User");

const {
  BUSINESS_TYPES,
  SELLER_TYPES,
  DOCUMENT_TYPES,
  normalizeBdPhone,
  isValidBdPhone,
  isValidNidOrPassport,
  getKycDocument,
  validateSellerKyc,
  buildSellerKycResponse,
} = require("../services/sellerKycService");

const {
  storePrivateKycFile,
  resolvePrivateKycFilePath,
  deletePrivateKycFile,
} = require("../services/sellerKycStorageService");

const { sendSms } = require("../services/smsService");

const KYC_SELECT = [
  "+kyc",
  "+warehouseAddress",
  "+sellerKycPhoneOtp",
  "+sellerKycPhoneOtp.otpHash",
  "+sellerKycPhoneOtp.otpExpiresAt",
  "+sellerKycPhoneOtp.otpAttempts",
  "+sellerKycPhoneOtp.otpLastSentAt",
  "+sellerKycPhoneOtp.otpSendCount",
  "+sellerKycPhoneOtp.otpSendWindowStart",
  "+adminReviewNote",
  "+sellerApplication.reviewNote",
].join(" ");

const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_SEND_WINDOW_MS = 60 * 60 * 1000;
const OTP_MAX_SENDS_PER_WINDOW = 5;
const OTP_MAX_ATTEMPTS = 5;

const isPlainObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

const loadCurrentUser = async (userId) => {
  return User.findById(userId).select(KYC_SELECT);
};

const ensureEditableApplicant = (user) => {
  if (!user) {
    return {
      ok: false,
      status: 404,
      message: "User not found.",
    };
  }

  if (!["customer", "seller"].includes(user.role)) {
    return {
      ok: false,
      status: 403,
      message: "Only seller applicants can manage seller KYC.",
    };
  }

  if (user.status !== "active") {
    return {
      ok: false,
      status: 403,
      message: "Inactive accounts cannot update seller KYC.",
    };
  }

  if (user.sellerStatus === "approved") {
    return {
      ok: false,
      status: 403,
      message: "Approved sellers cannot edit onboarding KYC here.",
    };
  }

  if (user.sellerStatus === "suspended") {
    return {
      ok: false,
      status: 403,
      message: "Suspended seller accounts cannot update KYC.",
    };
  }

  return { ok: true };
};

const invalidateKycSubmission = (user) => {
  if (user.kyc?.submittedAt) {
    user.kyc.submittedAt = null;
    user.verificationStatus = "not_submitted";
  } else if (user.verificationStatus === "pending_review") {
    user.verificationStatus = "not_submitted";
  }
};

const validateTextField = (
  value,
  fieldName,
  maximumLength,
  required = false
) => {
  if (typeof value !== "string") {
    return `${fieldName} must be text.`;
  }

  const trimmed = value.trim();

  if (required && !trimmed) {
    return `${fieldName} is required.`;
  }

  if (trimmed.length > maximumLength) {
    return `${fieldName} cannot exceed ${maximumLength} characters.`;
  }

  return null;
};

const uploadDocumentToSlot = (user, documentType, metadata) => {
  switch (documentType) {
    case "nid_front":
      user.kyc.nidDocuments.front = metadata;
      break;

    case "nid_back":
      user.kyc.nidDocuments.back = metadata;
      break;

    case "trade_license":
      user.kyc.tradeLicenseDocument = metadata;
      break;

    case "authorization":
      user.kyc.authorizationDocument = metadata;
      break;

    default:
      throw new Error("Unsupported KYC document type.");
  }
};

// ======================================================
// GET OWN KYC PROFILE
// GET /api/seller/kyc
// ======================================================

const getMyKyc = async (req, res) => {
  try {
    const user = await loadCurrentUser(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const response = buildSellerKycResponse(user);

    return res.status(200).json({
      message: "Seller KYC information retrieved.",
      kyc: response,

      sellerStatus: user.sellerStatus,
      verificationStatus: response.submittedAt
        ? user.verificationStatus
        : "not_submitted",

      isSubmitted: Boolean(response.submittedAt),
      reviewNote: user.sellerApplication?.reviewNote || "",
    });
  } catch (error) {
    console.error("Get seller KYC error:", error);

    return res.status(500).json({
      message: "Unable to retrieve seller KYC information.",
    });
  }
};

// ======================================================
// SAVE KYC DRAFT
// PUT /api/seller/kyc/draft
// ======================================================

const saveKycDraft = async (req, res) => {
  try {
    const user = await loadCurrentUser(req.user._id);

    const access = ensureEditableApplicant(user);

    if (!access.ok) {
      return res.status(access.status).json({
        message: access.message,
      });
    }

    const payload = req.body.kyc || req.body;

    if (!isPlainObject(payload)) {
      return res.status(400).json({
        message: "KYC data must be an object.",
      });
    }

    let changed = false;

    const textFields = {
      ownerName: 120,
      nidNumber: 30,
      legalBusinessName: 160,
      tradeLicenseNumber: 80,
      tinNumber: 30,
      binNumber: 30,
    };

    for (const [field, maxLength] of Object.entries(textFields)) {
      if (!Object.prototype.hasOwnProperty.call(payload, field)) {
        continue;
      }

      const value = payload[field];

      if (typeof value !== "string") {
        return res.status(400).json({
          message: `${field} must be text.`,
        });
      }

      if (value.trim().length > maxLength) {
        return res.status(400).json({
          message: `${field} cannot exceed ${maxLength} characters.`,
        });
      }

      user.kyc[field] = value.trim();
      changed = true;
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, "businessType")
    ) {
      if (!BUSINESS_TYPES.includes(payload.businessType)) {
        return res.status(400).json({
          message: "Invalid business type.",
        });
      }

      user.kyc.businessType = payload.businessType;
      changed = true;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "requestedSellerType"
      )
    ) {
      if (!SELLER_TYPES.includes(payload.requestedSellerType)) {
        return res.status(400).json({
          message: "Invalid requested seller type.",
        });
      }

      user.kyc.requestedSellerType =
        payload.requestedSellerType;

      changed = true;
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, "ownerPhone")
    ) {
      const normalizedPhone = normalizeBdPhone(payload.ownerPhone);

      if (!normalizedPhone) {
        return res.status(400).json({
          message: "Provide a valid Bangladesh phone number.",
        });
      }

      user.kyc.ownerPhone = normalizedPhone;
      changed = true;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "warehouseAddress"
      )
    ) {
      const address = req.body.warehouseAddress;

      if (!isPlainObject(address)) {
        return res.status(400).json({
          message: "Warehouse address must be an object.",
        });
      }

      const addressFields = [
        "street",
        "city",
        "district",
        "postalCode",
        "contactPerson",
        "phone",
      ];

      const maximumLengths = {
        street: 300,
        city: 100,
        district: 100,
        postalCode: 20,
        contactPerson: 120,
        phone: 20,
      };

      const updatedAddress = {
        street: user.warehouseAddress?.street || "",
        city: user.warehouseAddress?.city || "",
        district: user.warehouseAddress?.district || "",
        postalCode: user.warehouseAddress?.postalCode || "",
        contactPerson: user.warehouseAddress?.contactPerson || "",
        phone: user.warehouseAddress?.phone || "",
      };

      for (const field of addressFields) {
        if (!Object.prototype.hasOwnProperty.call(address, field)) {
          continue;
        }

        if (typeof address[field] !== "string") {
          return res.status(400).json({
            message: `Warehouse ${field} must be text.`,
          });
        }

        if (
          address[field].trim().length >
          maximumLengths[field]
        ) {
          return res.status(400).json({
            message: `Warehouse ${field} is too long.`,
          });
        }

        updatedAddress[field] = address[field].trim();
      }

      if (Object.prototype.hasOwnProperty.call(address, "phone")) {
        const normalizedPhone = normalizeBdPhone(address.phone);

        if (!normalizedPhone) {
          return res.status(400).json({
            message:
              "Provide a valid Bangladesh warehouse contact phone.",
          });
        }

        updatedAddress.phone = normalizedPhone;
      }

      user.warehouseAddress = updatedAddress;
      changed = true;
    }

    if (!changed) {
      return res.status(400).json({
        message: "No valid KYC fields were provided.",
      });
    }

    if (
      user.kyc.nidNumber &&
      !isValidNidOrPassport(user.kyc.nidNumber)
    ) {
      return res.status(400).json({
        message:
          "Provide a valid 10, 13, or 17 digit NID or passport number.",
      });
    }

    invalidateKycSubmission(user);

    await user.save();

    return res.status(200).json({
      message: "KYC draft saved successfully.",
      kyc: buildSellerKycResponse(user),
      verificationStatus: user.verificationStatus,
    });
  } catch (error) {
    console.error("Save seller KYC draft error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Unable to save KYC draft.",
    });
  }
};

// ======================================================
// UPLOAD KYC DOCUMENT
// POST /api/seller/kyc/documents
// ======================================================

const uploadKycDocument = async (req, res) => {
  let newStorageKey = null;

  try {
    const user = await loadCurrentUser(req.user._id);

    const access = ensureEditableApplicant(user);

    if (!access.ok) {
      return res.status(access.status).json({
        message: access.message,
      });
    }

    const documentType = String(
      req.body.documentType || ""
    ).trim();

    if (!DOCUMENT_TYPES.includes(documentType)) {
      return res.status(400).json({
        message:
          "documentType must be nid_front, nid_back, trade_license, or authorization.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Select a document to upload.",
      });
    }

    const allowedMimeTypes = {
      nid_front: [
        "image/jpeg",
        "image/png",
        "application/pdf",
      ],
      nid_back: [
        "image/jpeg",
        "image/png",
        "application/pdf",
      ],
      trade_license: [
        "application/pdf",
        "image/jpeg",
      ],
      authorization: [
        "application/pdf",
      ],
    };

    if (
      !allowedMimeTypes[documentType].includes(req.file.mimetype)
    ) {
      return res.status(400).json({
        message:
          "The selected document format is not allowed for this document type.",
      });
    }

    const previousDocument = getKycDocument(
      user,
      documentType
    );

    const metadata = await storePrivateKycFile(
      user._id,
      req.file
    );

    newStorageKey = metadata.storageKey;

    uploadDocumentToSlot(user, documentType, metadata);

    invalidateKycSubmission(user);

    await user.save();

    if (
      previousDocument?.storageKey &&
      previousDocument.storageKey !== metadata.storageKey
    ) {
      await deletePrivateKycFile(
        previousDocument.storageKey
      );
    }

    return res.status(201).json({
      message: "KYC document uploaded successfully.",
      documentType,
      document: {
        originalName: metadata.originalName,
        mimeType: metadata.mimeType,
        sizeBytes: metadata.sizeBytes,
        uploadedAt: metadata.uploadedAt,
      },
      verificationStatus: user.verificationStatus,
    });
  } catch (error) {
    if (newStorageKey) {
      await deletePrivateKycFile(newStorageKey).catch(
        (cleanupError) => {
          console.error(
            "KYC upload cleanup error:",
            cleanupError
          );
        }
      );
    }

    console.error("Upload KYC document error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(400).json({
      message: error.message || "Unable to upload KYC document.",
    });
  }
};

// ======================================================
// DELETE KYC DOCUMENT
// DELETE /api/seller/kyc/documents/:documentType
// ======================================================

const deleteKycDocument = async (req, res) => {
  try {
    const user = await loadCurrentUser(req.user._id);

    const access = ensureEditableApplicant(user);

    if (!access.ok) {
      return res.status(access.status).json({
        message: access.message,
      });
    }

    const documentType = req.params.documentType;

    if (!DOCUMENT_TYPES.includes(documentType)) {
      return res.status(400).json({
        message: "Invalid KYC document type.",
      });
    }

    const previousDocument = getKycDocument(
      user,
      documentType
    );

    switch (documentType) {
      case "nid_front":
        user.kyc.nidDocuments.front = {};
        break;

      case "nid_back":
        user.kyc.nidDocuments.back = {};
        break;

      case "trade_license":
        user.kyc.tradeLicenseDocument = {};
        break;

      case "authorization":
        user.kyc.authorizationDocument = {};
        break;
    }

    invalidateKycSubmission(user);

    await user.save();

    if (previousDocument?.storageKey) {
      await deletePrivateKycFile(
        previousDocument.storageKey
      );
    }

    return res.status(200).json({
      message: "KYC document deleted.",
      documentType,
    });
  } catch (error) {
    console.error("Delete KYC document error:", error);

    return res.status(500).json({
      message: "Unable to delete KYC document.",
    });
  }
};

// ======================================================
// DOWNLOAD OWN KYC DOCUMENT
// GET /api/seller/kyc/documents/:documentType
// ======================================================

const downloadMyKycDocument = async (req, res) => {
  try {
    const user = await loadCurrentUser(req.user._id);

    const access = ensureEditableApplicant(user);

    if (!access.ok && user?.sellerStatus !== "approved") {
      return res.status(access.status).json({
        message: access.message,
      });
    }

    const document = getKycDocument(
      user,
      req.params.documentType
    );

    if (!document?.storageKey) {
      return res.status(404).json({
        message: "KYC document not found.",
      });
    }

    const filePath = resolvePrivateKycFilePath(
      document.storageKey
    );

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");

    res.type(document.mimeType || "application/octet-stream");

    return res.download(
      filePath,
      document.originalName || "kyc-document",
      (error) => {
        if (error && !res.headersSent) {
          res.status(404).json({
            message: "KYC document could not be found.",
          });
        }
      }
    );
  } catch (error) {
    console.error("Download own KYC document error:", error);

    return res.status(404).json({
      message: "KYC document not found.",
    });
  }
};

// ======================================================
// SEND OWNER PHONE OTP
// POST /api/seller/kyc/phone/send-otp
// ======================================================

const sendOwnerPhoneOtp = async (req, res) => {
  try {
    const user = await loadCurrentUser(req.user._id);

    const access = ensureEditableApplicant(user);

    if (!access.ok) {
      return res.status(access.status).json({
        message: access.message,
      });
    }

    const phone = normalizeBdPhone(user.kyc?.ownerPhone);

    if (!phone) {
      return res.status(400).json({
        message: "Save a valid owner phone number first.",
      });
    }

    if (user.kyc.ownerPhoneVerified) {
      return res.status(400).json({
        message: "Owner phone number is already verified.",
      });
    }

    const now = new Date();
    const otpState = user.sellerKycPhoneOtp || {};

    if (
      otpState.otpLastSentAt &&
      now.getTime() - new Date(otpState.otpLastSentAt).getTime() <
        OTP_RESEND_COOLDOWN_MS
    ) {
      return res.status(429).json({
        message: "Please wait before requesting another OTP.",
      });
    }

    let windowStart = otpState.otpSendWindowStart;
    let sendCount = Number(otpState.otpSendCount || 0);

    if (
      !windowStart ||
      now.getTime() - new Date(windowStart).getTime() >=
        OTP_SEND_WINDOW_MS
    ) {
      windowStart = now;
      sendCount = 0;
    }

    if (sendCount >= OTP_MAX_SENDS_PER_WINDOW) {
      return res.status(429).json({
        message:
          "You have reached the phone OTP limit. Try again later.",
      });
    }

    const otp = crypto
      .randomInt(0, 10 ** OTP_LENGTH)
      .toString()
      .padStart(OTP_LENGTH, "0");

    const otpHash = await bcrypt.hash(otp, 10);

    user.sellerKycPhoneOtp.otpHash = otpHash;
    user.sellerKycPhoneOtp.otpExpiresAt = new Date(
      now.getTime() + OTP_EXPIRY_MS
    );
    user.sellerKycPhoneOtp.otpAttempts = 0;
    user.sellerKycPhoneOtp.otpLastSentAt = now;
    user.sellerKycPhoneOtp.otpSendCount = sendCount + 1;
    user.sellerKycPhoneOtp.otpSendWindowStart = windowStart;

    await user.save();

    try {
      await sendSms({
        to: phone,
        message:
          `Your LUTech seller verification code is ${otp}. ` +
          "It expires in 5 minutes. Do not share this code.",
      });
    } catch (smsError) {
      user.sellerKycPhoneOtp.otpHash = undefined;
      user.sellerKycPhoneOtp.otpExpiresAt = null;

      await user.save();

      console.error("Seller KYC OTP delivery error:", smsError);

      return res.status(503).json({
        message:
          "Unable to send verification SMS. Check SMS provider configuration.",
      });
    }

    return res.status(200).json({
      message: "Phone verification OTP sent successfully.",
      expiresInSeconds: OTP_EXPIRY_MS / 1000,
    });
  } catch (error) {
    console.error("Send owner phone OTP error:", error);

    return res.status(500).json({
      message: "Unable to send phone verification OTP.",
    });
  }
};

// ======================================================
// VERIFY OWNER PHONE OTP
// POST /api/seller/kyc/phone/verify-otp
// ======================================================

const verifyOwnerPhoneOtp = async (req, res) => {
  try {
    const otp =
      typeof req.body.otp === "string"
        ? req.body.otp.trim()
        : "";

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: "Enter a valid six-digit OTP.",
      });
    }

    const user = await loadCurrentUser(req.user._id);

    const access = ensureEditableApplicant(user);

    if (!access.ok) {
      return res.status(access.status).json({
        message: access.message,
      });
    }

    if (!isValidBdPhone(user.kyc?.ownerPhone)) {
      return res.status(400).json({
        message: "Save a valid owner phone number first.",
      });
    }

    if (user.kyc.ownerPhoneVerified) {
      return res.status(200).json({
        message: "Owner phone is already verified.",
        ownerPhoneVerified: true,
      });
    }

    const otpState = user.sellerKycPhoneOtp || {};

    if (
      !otpState.otpHash ||
      !otpState.otpExpiresAt
    ) {
      return res.status(400).json({
        message: "No active OTP. Request a new OTP.",
      });
    }

    if (
      new Date(otpState.otpExpiresAt).getTime() <= Date.now()
    ) {
      user.sellerKycPhoneOtp.otpHash = undefined;
      user.sellerKycPhoneOtp.otpExpiresAt = null;

      await user.save();

      return res.status(400).json({
        message: "OTP expired. Request a new OTP.",
      });
    }

    if (otpState.otpAttempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({
        message: "Too many incorrect attempts. Request a new OTP.",
      });
    }

    const matches = await bcrypt.compare(
      otp,
      otpState.otpHash
    );

    if (!matches) {
      user.sellerKycPhoneOtp.otpAttempts += 1;

      const remaining =
        OTP_MAX_ATTEMPTS -
        user.sellerKycPhoneOtp.otpAttempts;

      if (remaining <= 0) {
        user.sellerKycPhoneOtp.otpHash = undefined;
        user.sellerKycPhoneOtp.otpExpiresAt = null;
      }

      await user.save();

      return res.status(remaining <= 0 ? 429 : 400).json({
        message:
          remaining <= 0
            ? "Too many incorrect attempts. Request a new OTP."
            : `Invalid OTP. ${remaining} attempts remaining.`,
      });
    }

    user.kyc.ownerPhoneVerified = true;

    user.sellerKycPhoneOtp.otpHash = undefined;
    user.sellerKycPhoneOtp.otpExpiresAt = null;
    user.sellerKycPhoneOtp.otpAttempts = 0;

    await user.save();

    return res.status(200).json({
      message: "Owner phone number verified successfully.",
      ownerPhoneVerified: true,
    });
  } catch (error) {
    console.error("Verify owner phone OTP error:", error);

    return res.status(500).json({
      message: "Unable to verify owner phone number.",
    });
  }
};

// ======================================================
// SUBMIT KYC FOR REVIEW
// POST /api/seller/kyc/submit
// ======================================================

const submitSellerKyc = async (req, res) => {
  try {
    const user = await loadCurrentUser(req.user._id);

    const access = ensureEditableApplicant(user);

    if (!access.ok) {
      return res.status(access.status).json({
        message: access.message,
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Verify your email before submitting seller KYC.",
      });
    }

    if (
      !["pending", "rejected"].includes(user.sellerStatus)
    ) {
      return res.status(409).json({
        message:
          "Submit your seller application before submitting KYC.",
      });
    }

    const errors = validateSellerKyc(user);

    if (errors.length > 0) {
      return res.status(422).json({
        message: "Please complete the required KYC information.",
        errors,
      });
    }

    const now = new Date();

    user.sellerStatus = "pending";
    user.verificationStatus = "pending_review";

    user.kyc.submittedAt = now;

    user.adminReviewNote = "";
    user.sellerApplication.reviewNote = "";
    user.sellerApplication.submittedAt =
      user.sellerApplication.submittedAt || now;

    await user.save();

    return res.status(200).json({
      message: "Seller KYC submitted successfully for review.",
      sellerStatus: user.sellerStatus,
      verificationStatus: user.verificationStatus,
      submittedAt: user.kyc.submittedAt,
    });
  } catch (error) {
    console.error("Submit seller KYC error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Unable to submit seller KYC.",
    });
  }
};

module.exports = {
  getMyKyc,
  saveKycDraft,
  uploadKycDocument,
  deleteKycDocument,
  downloadMyKycDocument,
  sendOwnerPhoneOtp,
  verifyOwnerPhoneOtp,
  submitSellerKyc,
};