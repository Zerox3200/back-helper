import multer, { diskStorage } from "multer";
import { nanoid } from "nanoid";
import fs from "fs";
import sharp from "sharp";
import path from "path";

// ============================================================================
// Constants & file-kind presets (dynamic — pick per use-case)
// ============================================================================

const VALID_IMAGE_FORMATS = ["jpeg", "jpg", "png", "webp"];

/** Named kind presets — override per call when needed */
export const FILE_KINDS = {
  image: {
    allowedMimeTypes: [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/bmp",
      "image/tiff",
    ],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"],
  },
  pdf: {
    allowedMimeTypes: ["application/pdf"],
    allowedExtensions: [".pdf"],
  },
  spreadsheet: {
    allowedMimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/csv",
    ],
    allowedExtensions: [".xlsx", ".xls", ".csv"],
  },
  document: {
    allowedMimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ],
    allowedExtensions: [".pdf", ".doc", ".docx", ".txt"],
  },
  anySafe: {
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ],
    allowedExtensions: [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif",
      ".pdf",
      ".csv",
      ".xlsx",
      ".xls",
    ],
  },
};

const DANGEROUS_FILENAME_CHARS = /[^a-zA-Z0-9._-]/g;

const DEFAULT_COMPRESS_OPTIONS = {
  quality: 80,
  maxWidth: 1920,
  maxHeight: 1920,
  format: "jpeg",
};

const DEFAULT_LQIP_OPTIONS = {
  width: 64,
  quality: 45,
  blur: 1.5,
};

const DEFAULT_LIMITS = {
  fileSize: 5 * 1024 * 1024, // 5MB
  files: 10,
};

// ============================================================================
// Helpers
// ============================================================================

const validateFileExists = (filePath) => {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("Invalid file path provided");
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`Image file not found: ${filePath}`);
  }
};

const normalizeFormat = (format) => {
  const normalized = format?.toLowerCase().trim();
  if (!normalized || !VALID_IMAGE_FORMATS.includes(normalized)) {
    throw new Error(`Invalid format. Use: ${VALID_IMAGE_FORMATS.join(", ")}`);
  }
  return normalized === "jpg" ? "jpeg" : normalized;
};

const getImageMetadata = async (imagePath) => {
  try {
    const metadata = await sharp(imagePath).metadata();
    if (!metadata?.width || !metadata?.height) {
      throw new Error("Unable to read image dimensions");
    }
    return metadata;
  } catch (error) {
    throw new Error(`Failed to read image metadata: ${error.message}`);
  }
};

const calculateDimensions = (width, height, maxWidth, maxHeight) => {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  const aspectRatio = width / height;
  let newWidth = width;
  let newHeight = height;

  if (width > height) {
    newWidth = Math.min(width, maxWidth);
    newHeight = Math.round(newWidth / aspectRatio);
  } else {
    newHeight = Math.min(height, maxHeight);
    newWidth = Math.round(newHeight * aspectRatio);
  }

  return { width: newWidth, height: newHeight };
};

const createOutputPath = (imagePath, targetFormat) => {
  const fileInfo = path.parse(imagePath);
  const extension = targetFormat === "jpg" ? "jpeg" : targetFormat;
  const tempSuffix = `_compressed_${Date.now()}`;
  return path.join(fileInfo.dir, `${fileInfo.name}${tempSuffix}.${extension}`);
};

const applyFormatOptimization = (sharpInstance, format, quality) => {
  const normalizedFormat = normalizeFormat(format);
  const q = Math.max(1, Math.min(100, quality));

  switch (normalizedFormat) {
    case "jpeg":
      return sharpInstance.jpeg({ quality: q, mozjpeg: true, progressive: true });
    case "png":
      return sharpInstance.png({
        quality: q,
        compressionLevel: 9,
        adaptiveFiltering: true,
      });
    case "webp":
      return sharpInstance.webp({ quality: q, effort: 6 });
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
};

const safeDeleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.warn(`Warning: Could not delete file: ${filePath}`, error.message);
  }
};

const extractFilePath = (input) => {
  if (typeof input === "string") return input;
  if (input?.path) return input.path;
  if (input?.filepath) return input.filepath;
  throw new Error("Invalid input: cannot extract file path");
};

/** Sanitize client filename for display only — never used on disk. */
export const sanitizeOriginalFilename = (originalname) => {
  const base = path.basename(String(originalname || "file"));
  const cleaned = base.replace(DANGEROUS_FILENAME_CHARS, "_").slice(0, 180);
  return cleaned || "file";
};

const resolveKindFilter = (kindOrFilter = {}) => {
  if (typeof kindOrFilter === "string") {
    const preset = FILE_KINDS[kindOrFilter];
    if (!preset) {
      throw new Error(
        `Unknown file kind "${kindOrFilter}". Use: ${Object.keys(FILE_KINDS).join(", ")}`
      );
    }
    return { ...preset, strict: true, enabled: true };
  }
  return { enabled: true, strict: true, ...kindOrFilter };
};

const createFileFilter = (options = {}) => {
  const {
    allowedMimeTypes = FILE_KINDS.image.allowedMimeTypes,
    allowedExtensions = FILE_KINDS.image.allowedExtensions,
    strict = true,
  } = options;

  return (req, file, cb) => {
    try {
      const safeOriginal = sanitizeOriginalFilename(file.originalname);
      file.originalNameDisplay = safeOriginal;
      file.originalname = safeOriginal;

      const mime = (file.mimetype || "").toLowerCase();
      if (
        mime.includes("svg") ||
        mime.includes("html") ||
        mime.includes("javascript") ||
        mime.includes("x-msdownload") ||
        mime.includes("x-executable")
      ) {
        return cb(new Error("This file type is not allowed"), false);
      }

      const mimeTypeValid =
        file.mimetype && allowedMimeTypes.includes(file.mimetype.toLowerCase());
      const extensionValid =
        file.originalname &&
        allowedExtensions.includes(path.extname(file.originalname).toLowerCase());

      if (strict) {
        if (mimeTypeValid && extensionValid) return cb(null, true);
      } else if (mimeTypeValid || extensionValid) {
        return cb(null, true);
      }

      return cb(
        Object.assign(
          new Error(
            `Invalid file type. Allowed MIME: ${allowedMimeTypes.join(", ")}. ` +
              `Allowed extensions: ${allowedExtensions.join(", ")}`
          ),
          { statusCode: 400 }
        ),
        false
      );
    } catch (error) {
      return cb(new Error(`File filter error: ${error.message}`), false);
    }
  };
};

const processFile = async (file, processor) => {
  if (!file?.path) throw new Error("Invalid file object: missing path");

  const result = await processor(file.path);

  if (typeof result === "string") {
    file.path = result;
    file.filename = path.basename(result);
  } else if (result && typeof result === "object") {
    file.path = result.compressedPath || result.path || file.path;
    file.filename = path.basename(file.path);
    if (result.lqip) file.lqip = result.lqip;
  }

  return file;
};

const processFiles = async (files, processor) => {
  if (Array.isArray(files)) {
    return Promise.all(files.map((file) => processFile(file, processor)));
  }

  if (typeof files === "object" && files !== null) {
    const results = {};
    for (const fieldname in files) {
      const fieldFiles = Array.isArray(files[fieldname])
        ? files[fieldname]
        : [files[fieldname]];
      results[fieldname] = await Promise.all(
        fieldFiles.map((file) => processFile(file, processor))
      );
    }
    return results;
  }

  throw new Error("Invalid files input: expected array or object");
};

const getRelativePath = (filePath) => {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, "/");
  const uploadsIndex = normalized.indexOf("uploads/");
  if (uploadsIndex !== -1) {
    const p = normalized.substring(uploadsIndex);
    return p.startsWith("/") ? p : `/${p}`;
  }
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const getFileRelativePath = (file) => {
  if (!file?.path) return null;
  return getRelativePath(file.path);
};

const collectReqFiles = (req) => {
  const files = [];
  if (req.file) files.push(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) files.push(...req.files);
    else {
      for (const list of Object.values(req.files)) {
        if (Array.isArray(list)) files.push(...list);
        else if (list) files.push(list);
      }
    }
  }
  return files;
};

const attachRelativePaths = (req) => {
  if (req.file) req.file.relativePath = getFileRelativePath(req.file);

  if (req.files) {
    if (Array.isArray(req.files)) {
      req.files.forEach((file) => {
        file.relativePath = getFileRelativePath(file);
      });
    } else {
      for (const fieldname in req.files) {
        const list = Array.isArray(req.files[fieldname])
          ? req.files[fieldname]
          : [req.files[fieldname]];
        list.forEach((file) => {
          file.relativePath = getFileRelativePath(file);
        });
      }
    }
  }
};

// ============================================================================
// Core upload factory
// ============================================================================

/**
 * Create a Multer instance.
 *
 * @param {Object} options
 * @param {string} options.folder - Destination under uploads/ (required)
 * @param {string|Object} [options.fileFilter] - FILE_KINDS key or custom filter options
 * @param {Object} [options.limits] - Multer limits (fileSize, files, ...)
 * @param {string} [options.baseDir="uploads"] - Root upload directory
 */
export const upload = ({
  folder,
  fileFilter: fileFilterOptions = "image",
  limits = {},
  baseDir = "uploads",
} = {}) => {
  if (!folder || typeof folder !== "string") {
    throw new Error("Folder name is required");
  }

  const resolvedFilter = resolveKindFilter(fileFilterOptions);
  const { enabled = true, ...filterOptions } = resolvedFilter;

  const storage = diskStorage({
    destination: (req, file, cb) => {
      try {
        const destination = path.join(baseDir, folder, file.fieldname);
        fs.mkdirSync(destination, { recursive: true });
        cb(null, destination);
      } catch (error) {
        cb(error, null);
      }
    },
    filename: (req, file, cb) => {
      try {
        const safeOriginal = sanitizeOriginalFilename(file.originalname);
        file.originalNameDisplay = safeOriginal;
        const ext = path.extname(safeOriginal).toLowerCase() || "";
        cb(null, `${nanoid(24)}${ext}`);
      } catch (error) {
        cb(error, null);
      }
    },
  });

  const multerConfig = {
    storage,
    limits: { ...DEFAULT_LIMITS, ...limits },
  };

  if (enabled) {
    multerConfig.fileFilter = createFileFilter(filterOptions);
  }

  return multer(multerConfig);
};

/**
 * Build the correct multer handler from fields config.
 * @param {import('multer').Multer} uploadMiddleware
 * @param {string|string[]|Object[]} fields
 * @param {number} maxCount
 * @param {boolean} any
 */
const buildMulterHandler = (uploadMiddleware, fields, maxCount, any) => {
  if (any === true) return uploadMiddleware.any();

  if (typeof fields === "string") {
    return maxCount === 1
      ? uploadMiddleware.single(fields)
      : uploadMiddleware.array(fields, maxCount);
  }

  if (Array.isArray(fields)) {
    if (fields.length && typeof fields[0] === "object") {
      return uploadMiddleware.fields(fields);
    }
    return uploadMiddleware.fields(
      fields.map((name) => ({ name, maxCount }))
    );
  }

  throw new Error(
    "fields must be a string, string[], or { name, maxCount }[]"
  );
};

// ============================================================================
// Sharp — compress / LQIP
// ============================================================================

export const compressImage = async (imagePath, options = {}) => {
  const {
    quality = DEFAULT_COMPRESS_OPTIONS.quality,
    maxWidth = DEFAULT_COMPRESS_OPTIONS.maxWidth,
    maxHeight = DEFAULT_COMPRESS_OPTIONS.maxHeight,
    format = DEFAULT_COMPRESS_OPTIONS.format,
  } = options;

  try {
    validateFileExists(imagePath);
    const targetFormat = normalizeFormat(format);
    const outputPath = createOutputPath(imagePath, targetFormat);

    const metadata = await getImageMetadata(imagePath);
    const { width, height } = calculateDimensions(
      metadata.width,
      metadata.height,
      maxWidth,
      maxHeight
    );

    let sharpInstance = sharp(imagePath);

    if (width !== metadata.width || height !== metadata.height) {
      sharpInstance = sharpInstance.resize(width, height, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    sharpInstance = applyFormatOptimization(sharpInstance, targetFormat, quality);
    await sharpInstance.toFile(outputPath);

    const fileInfo = path.parse(imagePath);
    const originalExt = fileInfo.ext.toLowerCase().replace(".", "");
    const normalizedTarget = targetFormat === "jpg" ? "jpeg" : targetFormat;
    const finalExtension =
      (originalExt === "jpg" || originalExt === "jpeg") &&
      normalizedTarget === "jpeg"
        ? fileInfo.ext
        : `.${normalizedTarget}`;

    const finalPath = path.join(fileInfo.dir, `${fileInfo.name}${finalExtension}`);

    if (outputPath !== finalPath) {
      if (finalPath !== imagePath && fs.existsSync(finalPath)) {
        safeDeleteFile(finalPath);
      }
      fs.renameSync(outputPath, finalPath);
    }

    if (finalPath !== imagePath && fs.existsSync(imagePath)) {
      safeDeleteFile(imagePath);
    }

    return finalPath;
  } catch (error) {
    throw new Error(`Image compression failed: ${error.message}`);
  }
};

export const compressImages = async (images, options = {}) => {
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error("Images array is required and must not be empty");
  }
  const imagePaths = images.map(extractFilePath);
  return Promise.all(imagePaths.map((p) => compressImage(p, options)));
};

export const generateLQIP = async (imagePath, options = {}) => {
  const {
    width = DEFAULT_LQIP_OPTIONS.width,
    quality = DEFAULT_LQIP_OPTIONS.quality,
    blur = DEFAULT_LQIP_OPTIONS.blur,
  } = options;

  try {
    validateFileExists(imagePath);
    const metadata = await getImageMetadata(imagePath);
    const aspectRatio = metadata.height / metadata.width;
    const height = Math.max(1, Math.round(width * aspectRatio));

    const buffer = await sharp(imagePath)
      .resize(Math.max(1, width), height, {
        fit: "inside",
        withoutEnlargement: false,
      })
      .blur(Math.max(0, Math.min(100, blur)))
      .jpeg({
        quality: Math.max(1, Math.min(100, quality)),
        mozjpeg: true,
        progressive: true,
      })
      .toBuffer();

    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  } catch (error) {
    throw new Error(`LQIP generation failed: ${error.message}`);
  }
};

export const generateLQIPFile = async (imagePath, options = {}) => {
  const {
    width = DEFAULT_LQIP_OPTIONS.width,
    quality = DEFAULT_LQIP_OPTIONS.quality,
    blur = DEFAULT_LQIP_OPTIONS.blur,
    suffix = "_lqip",
  } = options;

  try {
    validateFileExists(imagePath);
    const fileInfo = path.parse(imagePath);
    const lqipPath = path.join(fileInfo.dir, `${fileInfo.name}${suffix}.jpg`);

    const metadata = await getImageMetadata(imagePath);
    const aspectRatio = metadata.height / metadata.width;
    const height = Math.max(1, Math.round(width * aspectRatio));

    await sharp(imagePath)
      .resize(Math.max(1, width), height, {
        fit: "inside",
        withoutEnlargement: false,
      })
      .blur(Math.max(0, Math.min(100, blur)))
      .jpeg({
        quality: Math.max(1, Math.min(100, quality)),
        mozjpeg: true,
        progressive: true,
      })
      .toFile(lqipPath);

    return lqipPath;
  } catch (error) {
    throw new Error(`LQIP file generation failed: ${error.message}`);
  }
};

export const compressImageWithLQIP = async (imagePath, options = {}) => {
  const {
    generateLQIP: shouldGenerateLQIP = true,
    lqipAsFile = false,
    lqipOptions = {},
    ...compressOptions
  } = options;

  try {
    const compressedPath = await compressImage(imagePath, compressOptions);

    let lqip = null;
    if (shouldGenerateLQIP) {
      if (lqipAsFile) {
        const lqipPath = await generateLQIPFile(compressedPath, lqipOptions);
        lqip = getRelativePath(lqipPath);
      } else {
        lqip = await generateLQIP(compressedPath, lqipOptions);
      }
    }

    return { compressedPath, lqip };
  } catch (error) {
    throw new Error(`Image compression with LQIP failed: ${error.message}`);
  }
};

export const compressUploadedImages = (options = {}) => {
  return async (req, res, next) => {
    try {
      if (req.file) {
        await processFile(req.file, (p) => compressImage(p, options));
      }
      if (req.files) {
        await processFiles(req.files, (p) => compressImage(p, options));
      }
      attachRelativePaths(req);
      next();
    } catch (error) {
      next(Object.assign(error, { statusCode: error.statusCode || 400 }));
    }
  };
};

export const compressUploadedImagesWithLQIP = (options = {}) => {
  return async (req, res, next) => {
    try {
      if (req.file) {
        await processFile(req.file, (p) => compressImageWithLQIP(p, options));
      }
      if (req.files) {
        await processFiles(req.files, (p) => compressImageWithLQIP(p, options));
      }
      attachRelativePaths(req);
      next();
    } catch (error) {
      next(Object.assign(error, { statusCode: error.statusCode || 400 }));
    }
  };
};

// ============================================================================
// Magic-byte validation (post-upload)
// ============================================================================

const matchesMagic = (buf, signature) => {
  if (!buf || buf.length < signature.length) return false;
  return signature.every((byte, i) => buf[i] === byte);
};

const detectFileKind = (buf) => {
  if (!buf || buf.length < 4) return null;
  if (matchesMagic(buf, [0xff, 0xd8, 0xff])) return "jpeg";
  if (matchesMagic(buf, [0x89, 0x50, 0x4e, 0x47])) return "png";
  if (matchesMagic(buf, [0x47, 0x49, 0x46])) return "gif";
  if (matchesMagic(buf, [0x42, 0x4d])) return "bmp";
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  if (buf.toString("ascii", 0, 4) === "%PDF") return "pdf";
  if (matchesMagic(buf, [0x50, 0x4b, 0x03, 0x04])) return "zip";
  if (buf[0] === 0xd0 && buf[1] === 0xcf) return "ole";
  const head = buf.toString("utf8", 0, Math.min(buf.length, 512)).toLowerCase();
  if (
    head.includes("<!doctype html") ||
    head.includes("<html") ||
    head.includes("<svg") ||
    head.includes("<script")
  ) {
    return "html";
  }
  if (/^[\s\w,"';.-]+$/.test(head.slice(0, 80))) return "csv";
  return null;
};

const EXT_TO_KIND = {
  ".jpg": "jpeg",
  ".jpeg": "jpeg",
  ".png": "png",
  ".gif": "gif",
  ".bmp": "bmp",
  ".webp": "webp",
  ".tif": "tiff",
  ".tiff": "tiff",
  ".pdf": "pdf",
  ".xlsx": "zip",
  ".xls": "ole",
  ".csv": "csv",
  ".docx": "zip",
};

/** Post-upload magic-byte validation. Deletes rejected files from disk. */
export const validateUploadedFileSignatures = async (req, res, next) => {
  const files = collectReqFiles(req);

  try {
    for (const file of files) {
      if (!file?.path || !fs.existsSync(file.path)) continue;

      const fd = fs.openSync(file.path, "r");
      const buf = Buffer.alloc(512);
      const bytesRead = fs.readSync(fd, buf, 0, 512, 0);
      fs.closeSync(fd);

      const sample = buf.subarray(0, bytesRead);
      const kind = detectFileKind(sample);
      const ext = path.extname(file.filename || file.originalname || "").toLowerCase();
      const expected = EXT_TO_KIND[ext];

      if (kind === "html") {
        safeDeleteFile(file.path);
        return next(Object.assign(new Error("File content rejected"), { statusCode: 400 }));
      }

      if (expected === "csv") continue;

      if (!kind) {
        safeDeleteFile(file.path);
        return next(Object.assign(new Error("File content rejected"), { statusCode: 400 }));
      }

      if (expected && kind !== expected) {
        const officeZipOk =
          (ext === ".xlsx" || ext === ".docx") && kind === "zip";
        const xlsOk = ext === ".xls" && (kind === "ole" || kind === "zip");
        if (!officeZipOk && !xlsOk) {
          safeDeleteFile(file.path);
          return next(
            Object.assign(new Error("File signature does not match extension"), {
              statusCode: 400,
            })
          );
        }
      }
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

// ============================================================================
// Dynamic middleware factories
// ============================================================================

/**
 * Generic file upload pipeline (no Sharp).
 * Returns [multerHandler, signatureValidator]
 */
export const fileUpload = (config = {}) => {
  const {
    folder,
    fields = "file",
    maxCount = 1,
    kind = "anySafe",
    fileFilter,
    limits,
    any = false,
    validateSignature = true,
  } = config;

  if (!folder) throw new Error("Folder name is required for fileUpload");

  const uploadMiddleware = upload({
    folder,
    fileFilter: fileFilter || kind,
    limits,
  });

  const multerHandler = buildMulterHandler(
    uploadMiddleware,
    fields,
    maxCount,
    any
  );

  const chain = [multerHandler];
  if (validateSignature) chain.push(validateUploadedFileSignatures);

  chain.push(async (req, res, next) => {
    attachRelativePaths(req);
    next();
  });

  return chain;
};

/**
 * Image upload + Sharp compress (+ optional LQIP) + signature check.
 * Returns middleware array — spread into the route: `...imageUpload(config)`
 *
 * @example
 * router.post("/", ...imageUpload({ folder: "avatars", fields: "image", maxCount: 1 }), ctrl)
 */
export const imageUpload = (config = {}) => {
  const {
    folder,
    fields = "image",
    maxCount = 5,
    generateLQIP = true,
    lqipAsFile = false,
    compressOptions = {},
    lqipOptions = {},
    fileFilter = "image",
    limits,
    any = false,
    validateSignature = true,
  } = config;

  if (!folder) {
    throw new Error("Folder name is required for imageUpload middleware");
  }

  const uploadMiddleware = upload({ folder, fileFilter, limits });
  const multerHandler = buildMulterHandler(
    uploadMiddleware,
    fields,
    maxCount,
    any
  );

  const processingMiddleware = generateLQIP
    ? compressUploadedImagesWithLQIP({
        ...compressOptions,
        lqipOptions,
        lqipAsFile,
      })
    : compressUploadedImages(compressOptions);

  const chain = [multerHandler];
  if (validateSignature) chain.push(validateUploadedFileSignatures);
  chain.push(processingMiddleware);
  return chain;
};

export const pdfUpload = (config = {}) =>
  fileUpload({ kind: "pdf", fields: "attachment", maxCount: 1, ...config });

export const spreadsheetUpload = (config = {}) =>
  fileUpload({ kind: "spreadsheet", fields: "file", maxCount: 1, ...config });

/**
 * Ready-made dynamic presets — override folder / fields per feature.
 *
 * @example
 * ...imageUpload(UPLOAD_PRESETS.avatar({ folder: "users" }))
 * ...imageUpload(UPLOAD_PRESETS.gallery({ folder: "products", maxCount: 8 }))
 */
export const UPLOAD_PRESETS = {
  avatar: (overrides = {}) => ({
    folder: "avatars",
    fields: "image",
    maxCount: 1,
    generateLQIP: true,
    lqipAsFile: false,
    compressOptions: {
      quality: 85,
      maxWidth: 800,
      maxHeight: 800,
      format: "jpeg",
    },
    lqipOptions: { width: 64, quality: 45, blur: 1.5 },
    limits: { fileSize: 2 * 1024 * 1024 },
    ...overrides,
  }),

  cover: (overrides = {}) => ({
    folder: "covers",
    fields: "cover",
    maxCount: 1,
    generateLQIP: true,
    lqipAsFile: false,
    compressOptions: {
      quality: 85,
      maxWidth: 1920,
      maxHeight: 1080,
      format: "jpeg",
    },
    lqipOptions: { width: 80, quality: 40, blur: 2 },
    limits: { fileSize: 5 * 1024 * 1024 },
    ...overrides,
  }),

  gallery: (overrides = {}) => ({
    folder: "gallery",
    fields: "images",
    maxCount: 10,
    generateLQIP: true,
    lqipAsFile: true,
    compressOptions: {
      quality: 85,
      maxWidth: 1600,
      maxHeight: 1600,
      format: "jpeg",
    },
    lqipOptions: { width: 64, quality: 45, blur: 1.5, suffix: "_lqip" },
    limits: { fileSize: 5 * 1024 * 1024, files: 10 },
    ...overrides,
  }),

  document: (overrides = {}) => ({
    folder: "documents",
    fields: "file",
    maxCount: 1,
    kind: "document",
    ...overrides,
  }),

  pdf: (overrides = {}) => ({
    folder: "pdfs",
    fields: "attachment",
    maxCount: 1,
    kind: "pdf",
    ...overrides,
  }),

  spreadsheet: (overrides = {}) => ({
    folder: "imports",
    fields: "file",
    maxCount: 1,
    kind: "spreadsheet",
    ...overrides,
  }),
};

// ============================================================================
// Extract helpers for controllers
// ============================================================================

export const extractImagePaths = (req, fieldNames = "image") => {
  const result = {};
  const fields = Array.isArray(fieldNames) ? fieldNames : [fieldNames];

  fields.forEach((fieldName) => {
    if (req.file && req.file.fieldname === fieldName) {
      result[fieldName] = req.file.relativePath || getFileRelativePath(req.file);
      result[`${fieldName}LQIP`] = req.file.lqip || null;
      return;
    }

    if (req.files) {
      if (Array.isArray(req.files)) {
        const fieldFiles = req.files.filter((f) => f.fieldname === fieldName);
        if (fieldFiles.length > 0) {
          result[fieldName] = fieldFiles.map(
            (f) => f.relativePath || getFileRelativePath(f)
          );
          result[`${fieldName}LQIP`] = fieldFiles.map((f) => f.lqip || null);
        }
      } else if (req.files[fieldName]) {
        const fieldFiles = Array.isArray(req.files[fieldName])
          ? req.files[fieldName]
          : [req.files[fieldName]];

        if (fieldFiles.length > 0) {
          result[fieldName] = fieldFiles.map(
            (f) => f.relativePath || getFileRelativePath(f)
          );
          result[`${fieldName}LQIP`] = fieldFiles.map((f) => f.lqip || null);
        }
      }
    }

    if (!result[fieldName]) {
      result[fieldName] = null;
      result[`${fieldName}LQIP`] = null;
    }
  });

  return result;
};

export const getSingleImage = (req, fieldName = "image") => {
  const extracted = extractImagePaths(req, fieldName);
  const pathValue = extracted[fieldName];
  return {
    path: Array.isArray(pathValue) ? pathValue[0] || null : pathValue || null,
    lqip: Array.isArray(extracted[`${fieldName}LQIP`])
      ? extracted[`${fieldName}LQIP`][0] || null
      : extracted[`${fieldName}LQIP`] || null,
  };
};

export const getMultipleImages = (req, fieldName = "images") => {
  const extracted = extractImagePaths(req, fieldName);
  const paths = Array.isArray(extracted[fieldName])
    ? extracted[fieldName]
    : extracted[fieldName]
      ? [extracted[fieldName]]
      : [];
  const lqips = Array.isArray(extracted[`${fieldName}LQIP`])
    ? extracted[`${fieldName}LQIP`]
    : extracted[`${fieldName}LQIP`]
      ? [extracted[`${fieldName}LQIP`]]
      : [];

  return { paths, lqips };
};

export const getSinglePdf = (req, fieldName = "attachment") => {
  if (req.file && req.file.fieldname === fieldName) {
    return req.file.relativePath || getFileRelativePath(req.file);
  }
  if (req.files?.[fieldName]?.[0]) {
    const file = req.files[fieldName][0];
    return file.relativePath || getFileRelativePath(file);
  }
  return null;
};
