
const express = require("express");
const sendEmail = require("../utils/sendEmail");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const recipient = process.env.EMAIL_TEST_RECIPIENT;

    if (!recipient) {
      return res.status(503).json({
        message: "EMAIL_TEST_RECIPIENT is not configured.",
      });
    }

    await sendEmail(
      recipient,
      "LUTech Test Email",
      "Congratulations! Your LUTech email system is working."
    );

    return res.status(200).json({
      message: "Test email sent successfully.",
    });
  } catch (error) {
    console.error("Test email error:", error);

    return res.status(500).json({
      message: "Unable to send test email.",
    });
  }
});

module.exports = router;
