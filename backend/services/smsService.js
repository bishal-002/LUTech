const sendSms = async ({ to, message }) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  const messagingServiceSid =
    process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken) {
    const error = new Error(
      "SMS provider credentials are not configured."
    );

    error.code = "SMS_NOT_CONFIGURED";
    throw error;
  }

  if (!phoneNumber && !messagingServiceSid) {
    const error = new Error(
      "Twilio phone number or messaging service SID is required."
    );

    error.code = "SMS_SENDER_NOT_CONFIGURED";
    throw error;
  }

  if (
    typeof to !== "string" ||
    !/^\+8801[3-9]\d{8}$/.test(to)
  ) {
    throw new Error("Invalid destination phone number.");
  }

  if (typeof message !== "string" || !message.trim()) {
    throw new Error("SMS message is required.");
  }

  const url =
    `https://api.twilio.com/2010-04-01/Accounts/` +
    `${accountSid}/Messages.json`;

  const parameters = new URLSearchParams();

  parameters.set("To", to);
  parameters.set("Body", message);

  if (messagingServiceSid) {
    parameters.set(
      "MessagingServiceSid",
      messagingServiceSid
    );
  } else {
    parameters.set("From", phoneNumber);
  }

  const authorization = Buffer.from(
    `${accountSid}:${authToken}`
  ).toString("base64");

  const response = await fetch(url, {
    method: "POST",

    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },

    body: parameters.toString(),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      result.message || "SMS delivery failed."
    );

    error.code = "SMS_DELIVERY_FAILED";
    error.providerStatus = response.status;

    throw error;
  }

  return {
    messageSid: result.sid || null,
    status: result.status || "queued",
  };
};

module.exports = {
  sendSms,
};