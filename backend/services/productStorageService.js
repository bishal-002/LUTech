const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ======================================================
// STORAGE ROOTS
// ======================================================

const PUBLIC_PRODUCT_MEDIA_ROOT = path.resolve(
  process.env.PRODUCT_PUBLIC_STORAGE_DIR ||
    path.join(__dirname, "..", "public_uploads", "products")
);

const PRIVATE_PRODUCT_PROOF_ROOT = path.resolve(
  process.env.PRODUCT_PRIVATE_STORAGE_DIR ||
    path.join(__dirname, "..", "private_uploads", "product-proofs")
);

// ======================================================
// SIZE LIMITS
// ======================================================

const MAX_PRODUCT_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_PRODUCT_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_PRODUCT_PROOF_SIZE = 10 * 1024 * 1024;

// ======================================================
// MIME / EXTENSION MAPS
// ======================================================

const MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "application/pdf": ".pdf",
};

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
];

const PROOF_TYPES = [
  "application/pdf",
  ...IMAGE_TYPES,
];

// ======================================================
// STORAGE ERROR
// ======================================================

const createStorageError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// ======================================================
// DETECT ACTUAL FILE TYPE
// Never trust file.mimetype alone.
// ======================================================

const detectFileMimeType = (buffer) => {
  if (!Buffer.isBuffer(buffer)) {
    return "";
  }

  // JPEG
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  // PNG
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

  // WebP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  // PDF
  if (
    buffer.length >= 5 &&
    buffer.subarray(0, 5).toString("ascii") === "%PDF-"
  ) {
    return "application/pdf";
  }

  // MP4 / ISO base media file format
  if (
    buffer.length >= 12 &&
    buffer.subarray(4, 8).toString("ascii") === "ftyp"
  ) {
    return "video/mp4";
  }

  // WebM / EBML
  if (
    buffer.length >= 4 &&
    buffer.subarray(0, 4).equals(
      Buffer.from([0x1a, 0x45, 0xdf, 0xa3])
    )
  ) {
    return "video/webm";
  }

  return "";
};

// ======================================================
// VERIFY FILE CONTENT AND SIZE
// ======================================================

const validateUploadedFile = (
  file,
  {
    allowedTypes,
    maxSize,
    label,
  }
) => {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw createStorageError(
      400,
      `${label} file is required.`
    );
  }

  if (
    !Number.isFinite(file.size) ||
    file.size <= 0 ||
    file.size > maxSize
  ) {
    throw createStorageError(
      413,
      `${label} file must be between 1 byte and ${Math.floor(
        maxSize / (1024 * 1024)
      )} MB.`
    );
  }

  const detectedMime = detectFileMimeType(file.buffer);

  if (!detectedMime || !allowedTypes.includes(detectedMime)) {
    throw createStorageError(
      415,
      `Unsupported ${label.toLowerCase()} file content.`
    );
  }

  if (detectedMime !== file.mimetype) {
    throw createStorageError(
      415,
      `The uploaded ${label.toLowerCase()} content does not match its declared file type.`
    );
  }

  const extension = MIME_EXTENSIONS[detectedMime];

  if (!extension) {
    throw createStorageError(
      415,
      `Unsupported ${label.toLowerCase()} file extension.`
    );
  }

  return {
    mimeType: detectedMime,
    extension,
  };
};

// ======================================================
// WRITE FILE SAFELY
// ======================================================

const writeNewFile = async (
  directory,
  fileName,
  buffer,
  mode
) => {
  await fs.promises.mkdir(directory, {
    recursive: true,
    mode,
  });

  const absolutePath = path.join(directory, fileName);

  await fs.promises.writeFile(absolutePath, buffer, {
    flag: "wx",
    mode,
  });

  return absolutePath;
};

// ======================================================
// STORE PUBLIC PRODUCT MEDIA
// kind: "image" | "video"
// ======================================================

const storePublicProductMedia = async (
  file,
  kind
) => {
  const isImage = kind === "image";
  const isVideo = kind === "video";

  if (!isImage && !isVideo) {
    throw createStorageError(
      400,
      "Invalid product media type."
    );
  }

  const validation = validateUploadedFile(file, {
    allowedTypes: isImage ? IMAGE_TYPES : VIDEO_TYPES,
    maxSize: isImage
      ? MAX_PRODUCT_IMAGE_SIZE
      : MAX_PRODUCT_VIDEO_SIZE,
    label: isImage ? "Image" : "Video",
  });

  const folder = isImage ? "images" : "videos";
  const directory = path.join(
    PUBLIC_PRODUCT_MEDIA_ROOT,
    folder
  );

  const fileName = `${crypto.randomUUID()}${validation.extension}`;

  await writeNewFile(
    directory,
    fileName,
    file.buffer,
    0o644
  );

  return {
    storageKey: path.posix.join(folder, fileName),
    mimeType: validation.mimeType,
    sizeBytes: file.size,
  };
};

// ======================================================
// STORE PRIVATE PRODUCT VERIFICATION PROOF
// ======================================================

const storePrivateProductProof = async (
  productId,
  file
) => {
  const safeProductId = String(productId || "");

  if (!/^[a-f0-9]{24}$/i.test(safeProductId)) {
    throw createStorageError(
      400,
      "Invalid product ID for proof storage."
    );
  }

  const validation = validateUploadedFile(file, {
    allowedTypes: PROOF_TYPES,
    maxSize: MAX_PRODUCT_PROOF_SIZE,
    label: "Product proof",
  });

  const directory = path.join(
    PRIVATE_PRODUCT_PROOF_ROOT,
    safeProductId
  );

  const fileName = `${crypto.randomUUID()}${validation.extension}`;

  await writeNewFile(
    directory,
    fileName,
    file.buffer,
    0o600
  );

  return {
    storageKey: path.posix.join(
      safeProductId,
      fileName
    ),
    mimeType: validation.mimeType,
    sizeBytes: file.size,
    uploadedAt: new Date(),
  };
};

// ======================================================
// PRIVATE PROOF KEY VALIDATION
// ======================================================

const isPrivateProductProofKey = (storageKey) => {
  if (
    typeof storageKey !== "string" ||
    !storageKey.trim()
  ) {
    return false;
  }

  const normalized = storageKey.replace(/\\/g, "/");
  const parts = normalized.split("/");

  return (
    parts.length === 2 &&
    /^[a-f0-9]{24}$/i.test(parts[0]) &&
    /^[a-f0-9-]{36}\.(jpg|png|webp|pdf)$/i.test(parts[1])
  );
};

const resolvePrivateProductProofPath = (storageKey) => {
  if (!isPrivateProductProofKey(storageKey)) {
    throw createStorageError(
      400,
      "Invalid private product proof key."
    );
  }

  const normalized = storageKey.replace(/\\/g, "/");

  const absolutePath = path.resolve(
    PRIVATE_PRODUCT_PROOF_ROOT,
    ...normalized.split("/")
  );

  if (
    !absolutePath.startsWith(
      PRIVATE_PRODUCT_PROOF_ROOT + path.sep
    )
  ) {
    throw createStorageError(
      400,
      "Invalid private product proof path."
    );
  }

  return absolutePath;
};

// ======================================================
// PRIVATE PROOF MIME TYPE
// ======================================================

const getPrivateProductProofMimeType = (storageKey) => {
  if (!isPrivateProductProofKey(storageKey)) {
    throw createStorageError(
      400,
      "Invalid private product proof key."
    );
  }

  const extension = path.extname(storageKey).toLowerCase();

  const mimeByExtension = {
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
  };

  return mimeByExtension[extension] || "application/octet-stream";
};

// ======================================================
// DELETE PRIVATE PROOF
// ======================================================

const deletePrivateProductProof = async (storageKey) => {
  if (!isPrivateProductProofKey(storageKey)) {
    return;
  }

  const absolutePath =
    resolvePrivateProductProofPath(storageKey);

  try {
    await fs.promises.unlink(absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  PUBLIC_PRODUCT_MEDIA_ROOT,

  MAX_PRODUCT_IMAGE_SIZE,
  MAX_PRODUCT_VIDEO_SIZE,
  MAX_PRODUCT_PROOF_SIZE,

  detectFileMimeType,
  validateUploadedFile,

  storePublicProductMedia,
  storePrivateProductProof,

  isPrivateProductProofKey,
  resolvePrivateProductProofPath,
  getPrivateProductProofMimeType,
  deletePrivateProductProof,
};