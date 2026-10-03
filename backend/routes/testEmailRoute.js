const express = require("express");
const router = express.Router();

const sendEmail = require("../utils/sendEmail");

router.get("/", async (req, res) => {
  await sendEmail(
    "dharbishal86@gmail.com",
    "LUTech Test Email",
    "Congratulations! Your email system is working."
  );

  res.json({
    message: "Test email sent",
  });
});

module.exports = router;