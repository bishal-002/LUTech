const mongoose = require("mongoose");

const User = require("../models/User");

const {
  isAllowedAdminEmail,
} = require("../services/adminPolicyService");

const validateAdminTargetEmail = async (
  req,
  res,
  next
) => {
  try {
    const { userId } = req.body || {};

    // Let the existing controller handle malformed and
    // missing IDs using its original validation rules.
    if (!mongoose.isValidObjectId(userId)) {
      return next();
    }

    const targetUser = await User.findById(userId)
      .select("_id email")
      .lean();

    // The existing controller will return the correct
    // not-found response.
    if (!targetUser) {
      return next();
    }

    if (!isAllowedAdminEmail(targetUser.email)) {
      return res.status(400).json({
        message:
          "The administrator email must belong to an authorized official domain.",
        code: "ADMIN_EMAIL_DOMAIN_NOT_ALLOWED",
      });
    }

    return next();
  } catch (error) {
    console.error(
      "Administrator target email validation failed:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to validate the administrator email domain.",
    });
  }
};

module.exports = validateAdminTargetEmail;