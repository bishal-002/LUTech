
const express = require("express");

const {
  getSellerProfile,
  updateSellerProfile,
} = require("../controllers/userController");

const {
  protect,
  sellerOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, sellerOnly);

router.get("/", getSellerProfile);
router.put("/", updateSellerProfile);

module.exports = router;
