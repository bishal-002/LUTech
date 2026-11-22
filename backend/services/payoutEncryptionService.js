const crypto = require("crypto");

const ENCRYPTION_PREFIX = "enc:v1:";

// ======================================================
// ENCRYPTION KEY
// ======================================================

const getEncryptionKey = () => {
  const configuredKey = process.env.PAYOUT_ENCRYPTION_KEY;

  if (!configuredKey) {
    throw new Error(
      "PAYOUT_ENCRYPTION_KEY is not configured."
    );
  }

  let key;

  if (/^[0-9a-fA-F]{64}$/.test(configuredKey)) {
    key = Buffer.from(configuredKey, "hex");
  } else {
    key = Buffer.from(configuredKey, "base64");
  }

  if (key.length !== 32) {
    throw new Error(
      "PAYOUT_ENCRYPTION_KEY must decode to exactly 32 bytes."
    );
  }

  return key;
};

// ======================================================
// CHECK ENCRYPTED VALUE
// ======================================================

const isEncryptedSensitiveValue = (value) => {
  return (
    typeof value === "string" &&
    value.startsWith(ENCRYPTION_PREFIX)
  );
};

// ======================================================
// ENCRYPT
// AES-256-GCM
// ======================================================

const encryptSensitiveValue = (plainText) => {
  if (
    typeof plainText !== "string" ||
    !plainText.trim()
  ) {
    throw new Error(
      "A non-empty value is required for encryption."
    );
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    key,
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return (
    ENCRYPTION_PREFIX +
    [
      iv.toString("base64url"),
      authTag.toString("base64url"),
      encrypted.toString("base64url"),
    ].join(".")
  );
};

// ======================================================
// DECRYPT
// ======================================================

const decryptSensitiveValue = (encryptedValue) => {
  if (!isEncryptedSensitiveValue(encryptedValue)) {
    throw new Error(
      "Payout account value is not encrypted. Run the payout migration script."
    );
  }

  const payload = encryptedValue.slice(
    ENCRYPTION_PREFIX.length
  );

  const parts = payload.split(".");

  if (parts.length !== 3) {
    throw new Error(
      "Invalid encrypted payout value format."
    );
  }

  const [ivPart, authTagPart, encryptedPart] = parts;

  const iv = Buffer.from(ivPart, "base64url");
  const authTag = Buffer.from(authTagPart, "base64url");
  const encrypted = Buffer.from(
    encryptedPart,
    "base64url"
  );

  if (iv.length !== 12 || authTag.length !== 16) {
    throw new Error(
      "Invalid encrypted payout value."
    );
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    iv
  );

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};

module.exports = {
  ENCRYPTION_PREFIX,
  getEncryptionKey,
  isEncryptedSensitiveValue,
  encryptSensitiveValue,
  decryptSensitiveValue,
};