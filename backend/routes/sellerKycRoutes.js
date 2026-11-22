const express = require("express");

const {
  protect,
} = require("../middleware/authMiddleware");

const {
  uploadSellerKycDocument,
} = require("../middleware/sellerKycUploadMiddleware");

const {
  getMyKyc,
  saveKycDraft,
  uploadKycDocument,
  deleteKycDocument,
  downloadMyKycDocument,
  sendOwnerPhoneOtp,
  verifyOwnerPhoneOtp,
  submitSellerKyc,
} = require("../controllers/sellerKycController");

const router = express.Router();

// Protect the entire KYC route group.
// Do not use sellerOnly here because pending applicants need access.
router.use(protect);

router.get("/", getMyKyc);

router.put("/draft", saveKycDraft);

router.post(
  "/documents",
  uploadSellerKycDocument,
  uploadKycDocument
);

router.delete(
  "/documents/:documentType",
  deleteKycDocument
);

router.get(
  "/documents/:documentType",
  downloadMyKycDocument
);

router.post(
  "/phone/send-otp",
  sendOwnerPhoneOtp
);

router.post(
  "/phone/verify-otp",
  verifyOwnerPhoneOtp
);

router.post(
  "/submit",
  submitSellerKyc
);

module.exports = router;