const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const {
  MAX_KYC_DOCUMENT_SIZE,
} = require("./sellerKycService");

const PRIVATE_STORAGE_ROOT = path.resolve(
  process.env.KYC_PRIVATE_STORAGE_DIR ||
    path.join(__dirname, "..", "private_uploads")
);

const MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "application/pdf": ".pdf",
};

const detectFileMimeType = (buffer) => {
  if (!Buffer.isBuffer(buffer)) return "";

  // PDF signature
  if (
    buffer.length >= 5 &&
    buffer.subarray(0, 5).toString("ascii") === "%PDF-"
  ) {
    return "application/pdf";
  }

  // JPEG signature
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  // PNG signature
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
      ])
    )
  ) {
    return "image/png";
  }

  return "";
};

const storePrivateKycFile = async (userId, file) => {
  if (!userId || !file?.buffer) {
    throw new Error("A user ID and uploaded file are required.");
  }

  if (
    !Number.isFinite(file.size) ||
    file.size <= 0 ||
    file.size > MAX_KYC_DOCUMENT_SIZE
  ) {
    throw new Error("Document size must be between 1 byte and 5 MB.");
  }

  const detectedMime = detectFileMimeType(file.buffer);

  if (!detectedMime || detectedMime !== file.mimetype) {
    throw new Error(
      "The uploaded document content does not match its file type."
    );
  }

  const extension = MIME_EXTENSIONS[detectedMime];

  if (!extension) {
    throw new Error("Unsupported document format.");
  }

  const safeUserId = String(userId);

  if (!/^[a-f0-9]{24}$/i.test(safeUserId)) {
    throw new Error("Invalid user ID for private file storage.");
  }

  const directory = path.join(
    PRIVATE_STORAGE_ROOT,
    "seller-kyc",
    safeUserId
  );

  await fs.promises.mkdir(directory, {
    recursive: true,
    mode: 0o700,
  });

  const fileName = `${crypto.randomUUID()}${extension}`;

  const absolutePath = path.join(directory, fileName);

  await fs.promises.writeFile(absolutePath, file.buffer, {
    flag: "wx",
    mode: 0o600,
  });

  const storageKey = path.posix.join(
    "seller-kyc",
    safeUserId,
    fileName
  );

  return {
    storageKey,
    originalName: path.basename(
      String(file.originalname || "document")
    ).slice(0, 255),
    mimeType: detectedMime,
    sizeBytes: file.size,
    uploadedAt: new Date(),
  };
};

const resolvePrivateKycFilePath = (storageKey) => {
  if (typeof storageKey !== "string" || !storageKey.trim()) {
    throw new Error("Invalid private document key.");
  }

  const normalizedKey = storageKey.replace(/\\/g, "/");

  if (
    normalizedKey.startsWith("/") ||
    normalizedKey.split("/").includes("..")
  ) {
    throw new Error("Invalid private document path.");
  }

  const absolutePath = path.resolve(
    PRIVATE_STORAGE_ROOT,
    ...normalizedKey.split("/")
  );

  if (!absolutePath.startsWith(PRIVATE_STORAGE_ROOT + path.sep)) {
    throw new Error("Invalid private document path.");
  }

  return absolutePath;
};

const deletePrivateKycFile = async (storageKey) => {
  if (!storageKey) return;

  const absolutePath = resolvePrivateKycFilePath(storageKey);

  try {
    await fs.promises.unlink(absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

module.exports = {
  storePrivateKycFile,
  resolvePrivateKycFilePath,
  deletePrivateKycFile,
  detectFileMimeType,
};