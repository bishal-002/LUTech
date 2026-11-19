
const crypto = require("crypto");
const net = require("node:net");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const MAX_ALLOWED_IPS = 20;

// ======================================================
// ENCRYPTION
// AES-256-GCM
// ======================================================

const getEncryptionKey = () => {
  const configuredKey = process.env.ADMIN_2FA_ENCRYPTION_KEY;

  if (!configuredKey) {
    throw new Error(
      "ADMIN_2FA_ENCRYPTION_KEY is not configured."
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
      "ADMIN_2FA_ENCRYPTION_KEY must decode to exactly 32 bytes."
    );
  }

  return key;
};

const encryptSecret = (plainText) => {
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

  return [
    "v1",
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
};

const decryptSecret = (encryptedValue) => {
  if (typeof encryptedValue !== "string") {
    throw new Error("Encrypted authenticator secret is missing.");
  }

  const parts = encryptedValue.split(".");

  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid encrypted authenticator secret.");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(parts[1], "base64");
  const authTag = Buffer.from(parts[2], "base64");
  const encrypted = Buffer.from(parts[3], "base64");

  if (iv.length !== 12 || authTag.length !== 16) {
    throw new Error("Invalid encrypted authenticator secret format.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    iv
  );

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};

// ======================================================
// BASE32
// ======================================================

const base32Encode = (buffer) => {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[
        (value >>> (bits - 5)) & 31
      ];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[
      (value << (5 - bits)) & 31
    ];
  }

  return output;
};

const base32Decode = (input) => {
  const normalized = String(input || "")
    .replace(/=+$/g, "")
    .replace(/[\s-]/g, "")
    .toUpperCase();

  if (
    !normalized ||
    !/^[A-Z2-7]+$/.test(normalized)
  ) {
    throw new Error("Invalid Base32 secret.");
  }

  let bits = 0;
  let value = 0;
  const output = [];

  for (const character of normalized) {
    value =
      (value << 5) |
      BASE32_ALPHABET.indexOf(character);

    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
};

// ======================================================
// AUTHENTICATOR APP TOTP
// RFC 6238, SHA-1, 6 DIGITS, 30-SECOND PERIOD
// ======================================================

const generateTotpSecret = () =>
  base32Encode(crypto.randomBytes(20));

const generateTotpCode = (secret, timestamp = Date.now()) => {
  const secretBuffer = base32Decode(secret);

  const counter = BigInt(
    Math.floor(timestamp / 30000)
  );

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);

  const digest = crypto
    .createHmac("sha1", secretBuffer)
    .update(counterBuffer)
    .digest();

  const offset = digest[digest.length - 1] & 0x0f;

  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 1000000).padStart(6, "0");
};

const verifyTotpCode = (
  secret,
  submittedCode,
  timestamp = Date.now(),
  window = 1
) => {
  if (!/^\d{6}$/.test(String(submittedCode || ""))) {
    return false;
  }

  const submitted = Buffer.from(String(submittedCode));

  for (let step = -window; step <= window; step++) {
    const expected = Buffer.from(
      generateTotpCode(
        secret,
        timestamp + step * 30000
      )
    );

    if (
      expected.length === submitted.length &&
      crypto.timingSafeEqual(expected, submitted)
    ) {
      return true;
    }
  }

  return false;
};

const buildOtpAuthUrl = (secret, email) => {
  const issuer = "LUTech";
  const label = `${issuer}:${email}`;

  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });

  return (
    `otpauth://totp/${encodeURIComponent(label)}?` +
    params.toString()
  );
};

// ======================================================
// EMAIL OTP
// ======================================================

const generateEmailOtp = () =>
  crypto.randomInt(0, 1000000).toString().padStart(6, "0");

const hashOtp = (otp) =>
  bcrypt.hash(String(otp), 10);

const verifyHashedOtp = (otp, hashedOtp) => {
  if (!otp || !hashedOtp) return Promise.resolve(false);

  return bcrypt.compare(String(otp), hashedOtp);
};

const sendEmailOtp = async ({
  email,
  otp,
  subject = "LUTech Administrator Security Code",
  purpose = "administrator security verification",
}) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email service is not configured.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    text:
      `Your LUTech code for ${purpose} is ${otp}. ` +
      "It expires in 5 minutes. Do not share this code with anyone.",
  });
};

// ======================================================
// IP ADDRESS PARSING
// ======================================================

const parseIpAddress = (input) => {
  if (typeof input !== "string" || !input.trim()) {
    return null;
  }

  let address = input.trim();

  if (address.startsWith("[") && address.endsWith("]")) {
    address = address.slice(1, -1);
  }

  address = address.split("%")[0];

  const version = net.isIP(address);

  if (version === 4) {
    const parts = address.split(".").map(Number);

    const value = parts.reduce(
      (result, part) => (result << 8n) | BigInt(part),
      0n
    );

    return {
      version: 4,
      value,
      mapped: false,
    };
  }

  if (version !== 6) return null;

  let normalized = address.toLowerCase();

  if (normalized.includes(".")) {
    const lastColon = normalized.lastIndexOf(":");

    if (lastColon < 0) return null;

    const ipv4 = normalized.slice(lastColon + 1);

    if (net.isIP(ipv4) !== 4) return null;

    const octets = ipv4.split(".").map(Number);

    const firstGroup = (
      (octets[0] << 8) | octets[1]
    ).toString(16);

    const secondGroup = (
      (octets[2] << 8) | octets[3]
    ).toString(16);

    normalized =
      normalized.slice(0, lastColon + 1) +
      firstGroup +
      ":" +
      secondGroup;
  }

  const halves = normalized.split("::");

  if (halves.length > 2) return null;

  let groups;

  if (halves.length === 2) {
    const left = halves[0] ? halves[0].split(":") : [];
    const right = halves[1] ? halves[1].split(":") : [];

    const missingGroups = 8 - left.length - right.length;

    if (missingGroups < 1) return null;

    groups = [
      ...left,
      ...Array(missingGroups).fill("0"),
      ...right,
    ];
  } else {
    groups = normalized.split(":");

    if (groups.length !== 8) return null;
  }

  if (
    groups.length !== 8 ||
    groups.some(
      (group) => !/^[0-9a-f]{1,4}$/.test(group)
    )
  ) {
    return null;
  }

  const value = groups.reduce(
    (result, group) =>
      (result << 16n) | BigInt(parseInt(group, 16)),
    0n
  );

  const mapped = (value >> 32n) === 0xffffn;

  if (mapped) {
    return {
      version: 4,
      value: value & ((1n << 32n) - 1n),
      mapped: true,
    };
  }

  return {
    version: 6,
    value,
    mapped: false,
  };
};

// ======================================================
// IP / CIDR VALIDATION
// ======================================================

const parseAllowedIpRule = (rule) => {
  if (typeof rule !== "string") return null;

  const parts = rule.trim().split("/");

  if (parts.length > 2 || !parts[0]) {
    return null;
  }

  const parsedIp = parseIpAddress(parts[0]);

  if (!parsedIp) return null;

  let prefix;

  if (parts.length === 1) {
    prefix = parsedIp.version === 4 ? 32 : 128;
  } else {
    if (!/^\d+$/.test(parts[1])) return null;

    prefix = Number(parts[1]);

    if (parsedIp.mapped) {
      if (prefix < 96) return null;
      prefix -= 96;
    }
  }

  const maxBits = parsedIp.version === 4 ? 32 : 128;

  if (
    !Number.isInteger(prefix) ||
    prefix < 0 ||
    prefix > maxBits
  ) {
    return null;
  }

  return {
    ...parsedIp,
    prefix,
  };
};

const normalizeAllowedIps = (allowedIps) => {
  if (!Array.isArray(allowedIps)) {
    throw new Error("Allowed IPs must be an array.");
  }

  if (allowedIps.length > MAX_ALLOWED_IPS) {
    throw new Error(
      `A maximum of ${MAX_ALLOWED_IPS} IP or CIDR rules is allowed.`
    );
  }

  const normalized = [];

  for (const item of allowedIps) {
    if (typeof item !== "string" || !item.trim()) {
      throw new Error(
        "Every allowed IP entry must be a non-empty string."
      );
    }

    const rule = item.trim().toLowerCase();

    if (!parseAllowedIpRule(rule)) {
      throw new Error(
        `Invalid IP address or CIDR rule: ${item}`
      );
    }

    if (normalized.includes(rule)) {
      throw new Error(`Duplicate IP rule: ${rule}`);
    }

    normalized.push(rule);
  }

  return normalized;
};

const ipMatchesRule = (requestIp, rule) => {
  const request = parseIpAddress(requestIp);
  const network = parseAllowedIpRule(rule);

  if (
    !request ||
    !network ||
    request.version !== network.version
  ) {
    return false;
  }

  const bits = network.version === 4 ? 32 : 128;
  const shift = BigInt(bits - network.prefix);

  return (
    (request.value >> shift) ===
    (network.value >> shift)
  );
};

const isIpAllowed = (requestIp, allowedIps) => {
  if (!Array.isArray(allowedIps)) return false;

  return allowedIps.some((rule) =>
    ipMatchesRule(requestIp, rule)
  );
};

const getRequestIp = (req) =>
  req.ip || req.socket?.remoteAddress || "";

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  OTP_EXPIRY_MS,
  OTP_MAX_ATTEMPTS,

  encryptSecret,
  decryptSecret,

  generateTotpSecret,
  generateTotpCode,
  verifyTotpCode,
  buildOtpAuthUrl,

  generateEmailOtp,
  hashOtp,
  verifyHashedOtp,
  sendEmailOtp,

  normalizeAllowedIps,
  isIpAllowed,
  getRequestIp,
};
