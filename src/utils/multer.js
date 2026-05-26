import multer, { diskStorage } from 'multer';
import { nanoid } from 'nanoid';
import fs from 'fs';
import sharp from 'sharp';
import path from 'path';

// ============================================================================
// Constants & Configuration
// ============================================================================

const VALID_IMAGE_FORMATS = ['jpeg', 'jpg', 'png', 'webp'];

// Allowed MIME types for images
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/svg+xml'
];

// Allowed file extensions (case-insensitive)
const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.tif', '.svg'
];

const DEFAULT_COMPRESS_OPTIONS = {
  quality: 80,
  maxWidth: 1920,
  maxHeight: 1920,
  format: 'jpeg'
};
const DEFAULT_LQIP_OPTIONS = {
  width: 250,
  quality: 45,
  blur: 1.5
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates if a file exists
 */
const validateFileExists = (filePath) => {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path provided');
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`Image file not found: ${filePath}`);
  }
};

/**
 * Validates and normalizes image format
 */
const normalizeFormat = (format) => {
  const normalized = format?.toLowerCase().trim();
  if (!normalized || !VALID_IMAGE_FORMATS.includes(normalized)) {
    throw new Error(`Invalid format. Use: ${VALID_IMAGE_FORMATS.join(', ')}`);
  }
  return normalized === 'jpg' ? 'jpeg' : normalized;
};

/**
 * Gets image metadata and validates it
 */
const getImageMetadata = async (imagePath) => {
  try {
    const metadata = await sharp(imagePath).metadata();
    if (!metadata?.width || !metadata?.height) {
      throw new Error('Unable to read image dimensions');
    }
    return metadata;
  } catch (error) {
    throw new Error(`Failed to read image metadata: ${error.message}`);
  }
};

/**
 * Calculates new dimensions while maintaining aspect ratio
 */
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

/**
 * Determines if format change is needed
 */
const needsFormatChange = (originalExt, targetFormat) => {
  const normalizedExt = originalExt.toLowerCase().replace('.', '');
  const normalizedTarget = targetFormat === 'jpg' ? 'jpeg' : targetFormat;
  
  // Handle jpg/jpeg equivalence
  if ((normalizedExt === 'jpg' || normalizedExt === 'jpeg') && 
      normalizedTarget === 'jpeg') {
    return false;
  }
  
  return normalizedExt !== normalizedTarget;
};

/**
 * Creates output path for processed image
 * Always creates a temporary path to avoid "same file" error with Sharp
 */
const createOutputPath = (imagePath, targetFormat) => {
  const fileInfo = path.parse(imagePath);
  const originalExt = fileInfo.ext;
  
  // Always create a temporary output path to avoid Sharp's "same file" error
  const extension = targetFormat === 'jpg' ? 'jpeg' : targetFormat;
  const tempSuffix = `_compressed_${Date.now()}`;
  return path.join(fileInfo.dir, `${fileInfo.name}${tempSuffix}.${extension}`);
};

/**
 * Applies format-specific optimizations to Sharp instance
 */
const applyFormatOptimization = (sharpInstance, format, quality) => {
  const normalizedFormat = normalizeFormat(format);

  switch (normalizedFormat) {
    case 'jpeg':
      return sharpInstance.jpeg({
        quality: Math.max(1, Math.min(100, quality)),
        mozjpeg: true,
        progressive: true
      });
    
    case 'png':
      return sharpInstance.png({
        quality: Math.max(1, Math.min(100, quality)),
        compressionLevel: 9,
        adaptiveFiltering: true
      });
    
    case 'webp':
      return sharpInstance.webp({
        quality: Math.max(1, Math.min(100, quality)),
        effort: 6
      });
    
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
};

/**
 * Safely deletes a file
 */
const safeDeleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.warn(`Warning: Could not delete file: ${filePath}`, error.message);
  }
};

/**
 * Extracts file path from various input types
 */
const extractFilePath = (input) => {
  if (typeof input === 'string') return input;
  if (input?.path) return input.path;
  if (input?.filepath) return input.filepath;
  throw new Error('Invalid input: cannot extract file path');
};

/**
 * Validates if file extension is allowed
 */
const isValidExtension = (filename) => {
  if (!filename || typeof filename !== 'string') {
    return false;
  }
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
};

/**
 * Validates if MIME type is allowed
 */
const isValidMimeType = (mimetype) => {
  if (!mimetype || typeof mimetype !== 'string') {
    return false;
  }
  return ALLOWED_MIME_TYPES.includes(mimetype.toLowerCase());
};

/**
 * File filter function for Multer - rejects non-image files
 * @param {Object} options - Filter options
 * @param {string[]} options.allowedMimeTypes - Custom allowed MIME types
 * @param {string[]} options.allowedExtensions - Custom allowed extensions
 * @param {boolean} options.strict - If true, requires both MIME type and extension match
 * @returns {Function} - Multer file filter function
 */
const createFileFilter = (options = {}) => {
  const {
    allowedMimeTypes = ALLOWED_MIME_TYPES,
    allowedExtensions = ALLOWED_EXTENSIONS,
    strict = false
  } = options;

  return (req, file, cb) => {
    try {
      // Check MIME type
      const mimeTypeValid = file.mimetype && 
        allowedMimeTypes.includes(file.mimetype.toLowerCase());

      // Check file extension
      const extensionValid = file.originalname && 
        allowedExtensions.includes(path.extname(file.originalname).toLowerCase());

      // In strict mode, both must be valid
      // In non-strict mode, at least one must be valid
      if (strict) {
        if (mimeTypeValid && extensionValid) {
          cb(null, true);
        } else {
          cb(new Error(
            `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}. ` +
            `Allowed extensions: ${allowedExtensions.join(', ')}`
          ), false);
        }
      } else {
        if (mimeTypeValid || extensionValid) {
          cb(null, true);
        } else {
          cb(new Error(
            `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}. ` +
            `Allowed extensions: ${allowedExtensions.join(', ')}`
          ), false);
        }
      }
    } catch (error) {
      cb(new Error(`File filter error: ${error.message}`), false);
    }
  };
};

/**
 * Processes a single file object
 */
const processFile = async (file, processor) => {
  if (!file?.path) {
    throw new Error('Invalid file object: missing path');
  }
  
  const result = await processor(file.path);
  
  if (typeof result === 'string') {
    file.path = result;
    file.filename = path.basename(result);
  } else if (result && typeof result === 'object') {
    file.path = result.compressedPath || result.path || file.path;
    file.filename = path.basename(file.path);
    if (result.lqip) file.lqip = result.lqip;
  }
  
  return file;
};

/**
 * Processes multiple files (array or object)
 */
const processFiles = async (files, processor) => {
  if (Array.isArray(files)) {
    return Promise.all(files.map(file => processFile(file, processor)));
  }

  if (typeof files === 'object' && files !== null) {
    const results = {};
    for (const fieldname in files) {
      const fieldFiles = Array.isArray(files[fieldname]) 
        ? files[fieldname] 
        : [files[fieldname]];
      results[fieldname] = await Promise.all(
        fieldFiles.map(file => processFile(file, processor))
      );
    }
    return results;
  }

  throw new Error('Invalid files input: expected array or object');
};

// ============================================================================
// Main Upload Function
// ============================================================================

/**
 * Creates Multer upload middleware with file filtering
 * @param {Object} options - Upload configuration
 * @param {string} options.folder - Folder name for uploads (required)
 * @param {Object} options.fileFilter - File filter options
 * @param {string[]} options.fileFilter.allowedMimeTypes - Custom allowed MIME types
 * @param {string[]} options.fileFilter.allowedExtensions - Custom allowed extensions
 * @param {boolean} options.fileFilter.strict - Require both MIME type and extension match
 * @param {boolean} options.fileFilter.enabled - Enable/disable file filtering (default: true)
 * @returns {Object} - Multer middleware instance
 */
export const upload = ({ folder, fileFilter: fileFilterOptions = {}, normalizeFieldname }) => {
  if (!folder || typeof folder !== 'string') {
    throw new Error('Folder name is required');
  }

  const {
    enabled = true,
    ...filterOptions
  } = fileFilterOptions;

  const storage = diskStorage({
    destination: (req, file, cb) => {
      try {
      const subDir = typeof normalizeFieldname === 'function'
        ? (normalizeFieldname(file.fieldname) || file.fieldname)
        : file.fieldname;
      const destination = `uploads/${folder}/${subDir}`;
      fs.mkdirSync(destination, { recursive: true });
      cb(null, destination);
      } catch (error) {
        cb(error, null);
      }
    },
    filename: (req, file, cb) => {
      try {
        const filename = `${nanoid()}-${file.originalname}`;
        cb(null, filename);
      } catch (error) {
        cb(error, null);
      }
    }
  });

  const multerConfig = { storage };

  // Add file filter if enabled
  if (enabled) {
    multerConfig.fileFilter = createFileFilter(filterOptions);
  }

  return multer(multerConfig);
};

// ============================================================================
// Image Compression Functions
// ============================================================================

/**
 * Compress and optimize image for web performance
 * @param {string} imagePath - Path to the image file
 * @param {Object} options - Compression options
 * @param {number} options.quality - JPEG/WebP quality (1-100), default: 80
 * @param {number} options.maxWidth - Maximum width in pixels, default: 1920
 * @param {number} options.maxHeight - Maximum height in pixels, default: 1920
 * @param {string} options.format - Output format ('jpeg', 'png', 'webp'), default: 'jpeg'
 * @returns {Promise<string>} - Path to the compressed image
 */
export const compressImage = async (imagePath, options = {}) => {
  const {
    quality = DEFAULT_COMPRESS_OPTIONS.quality,
    maxWidth = DEFAULT_COMPRESS_OPTIONS.maxWidth,
    maxHeight = DEFAULT_COMPRESS_OPTIONS.maxHeight,
    format = DEFAULT_COMPRESS_OPTIONS.format
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

    // Auto-orient based on EXIF data to prevent rotated uploads from phones.
    let sharpInstance = sharp(imagePath).rotate();

    // Resize if dimensions changed
    if (width !== metadata.width || height !== metadata.height) {
      sharpInstance = sharpInstance.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Apply format-specific optimizations
    sharpInstance = applyFormatOptimization(sharpInstance, targetFormat, quality);

    // Write compressed image to temporary path
    await sharpInstance.toFile(outputPath);

    // Determine final path (same as original if format didn't change, or new extension if it did)
    const fileInfo = path.parse(imagePath);
    const originalExt = fileInfo.ext.toLowerCase().replace('.', '');
    const normalizedTarget = targetFormat === 'jpg' ? 'jpeg' : targetFormat;
    const finalExtension = (originalExt === 'jpg' || originalExt === 'jpeg') && normalizedTarget === 'jpeg'
      ? fileInfo.ext
      : `.${normalizedTarget}`;
    
    const finalPath = path.join(fileInfo.dir, `${fileInfo.name}${finalExtension}`);

    // If final path is different from temp path, move/rename the file
    if (outputPath !== finalPath) {
      // Delete old file if it exists and is different
      if (finalPath !== imagePath && fs.existsSync(finalPath)) {
        safeDeleteFile(finalPath);
      }
      // Move temp file to final location
      fs.renameSync(outputPath, finalPath);
    }

    // Delete original file if it's different from final path
    if (finalPath !== imagePath && fs.existsSync(imagePath)) {
      safeDeleteFile(imagePath);
    }

    return finalPath;
  } catch (error) {
    throw new Error(`Image compression failed: ${error.message}`);
  }
};

/**
 * Compress multiple images
 * @param {string[]|Object[]} images - Array of image paths or file objects
 * @param {Object} options - Compression options
 * @returns {Promise<string[]>} - Array of paths to compressed images
 */
export const compressImages = async (images, options = {}) => {
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('Images array is required and must not be empty');
  }

  try {
    const imagePaths = images.map(extractFilePath);
    return Promise.all(imagePaths.map(path => compressImage(path, options)));
  } catch (error) {
    throw new Error(`Batch image compression failed: ${error.message}`);
  }
};

// ============================================================================
// LQIP Functions
// ============================================================================

/**
 * Generate Low Quality Image Placeholder (LQIP) as base64 data URI
 * @param {string} imagePath - Path to the image file
 * @param {Object} options - LQIP options
 * @param {number} options.width - Placeholder width in pixels, default: 20
 * @param {number} options.quality - JPEG quality (1-100), default: 20
 * @param {number} options.blur - Blur radius (0-100), default: 4
 * @returns {Promise<string>} - Base64 data URI
 */
export const generateLQIP = async (imagePath, options = {}) => {
  const {
    width = DEFAULT_LQIP_OPTIONS.width,
    quality = DEFAULT_LQIP_OPTIONS.quality,
    blur = DEFAULT_LQIP_OPTIONS.blur
  } = options;

  try {
    validateFileExists(imagePath);
    
    const metadata = await getImageMetadata(imagePath);
    const aspectRatio = metadata.height / metadata.width;
    const height = Math.max(1, Math.round(width * aspectRatio));

    const buffer = await sharp(imagePath)
      .rotate()
      .resize(Math.max(1, width), height, {
        fit: 'inside',
        withoutEnlargement: false
      })
      .blur(Math.max(0, Math.min(100, blur)))
      .jpeg({
        quality: Math.max(1, Math.min(100, quality)),
        mozjpeg: true,
        progressive: true
      })
      .toBuffer();

    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  } catch (error) {
    throw new Error(`LQIP generation failed: ${error.message}`);
  }
};

/**
 * Generate LQIP and save as a separate file
 * @param {string} imagePath - Path to the image file
 * @param {Object} options - LQIP options
 * @param {number} options.width - Placeholder width in pixels, default: 20
 * @param {number} options.quality - JPEG quality (1-100), default: 20
 * @param {number} options.blur - Blur radius (0-100), default: 4
 * @param {string} options.suffix - Suffix for placeholder filename, default: '_lqip'
 * @returns {Promise<string>} - Path to the LQIP file
 */
export const generateLQIPFile = async (imagePath, options = {}) => {
  const {
    width = DEFAULT_LQIP_OPTIONS.width,
    quality = DEFAULT_LQIP_OPTIONS.quality,
    blur = DEFAULT_LQIP_OPTIONS.blur,
    suffix = '_lqip'
  } = options;

  try {
    validateFileExists(imagePath);
    
    const fileInfo = path.parse(imagePath);
    const lqipPath = path.join(fileInfo.dir, `${fileInfo.name}${suffix}.jpg`);
    
    const metadata = await getImageMetadata(imagePath);
    const aspectRatio = metadata.height / metadata.width;
    const height = Math.max(1, Math.round(width * aspectRatio));

    await sharp(imagePath)
      .rotate()
      .resize(Math.max(1, width), height, {
        fit: 'inside',
        withoutEnlargement: false
      })
      .blur(Math.max(0, Math.min(100, blur)))
      .jpeg({
        quality: Math.max(1, Math.min(100, quality)),
        mozjpeg: true,
        progressive: true
      })
      .toFile(lqipPath);

    return lqipPath;
  } catch (error) {
    throw new Error(`LQIP file generation failed: ${error.message}`);
  }
};

/**
 * Compress image and generate LQIP in one operation
 * @param {string} imagePath - Path to the image file
 * @param {Object} options - Compression and LQIP options
 * @param {boolean} options.generateLQIP - Whether to generate LQIP, default: true
 * @param {Object} options.lqipOptions - Options for LQIP generation
 * @returns {Promise<Object>} - Object with compressedPath and lqip
 */
export const compressImageWithLQIP = async (imagePath, options = {}) => {
  const {
    generateLQIP: shouldGenerateLQIP = true,
    lqipOptions = {},
    ...compressOptions
  } = options;

  try {
    const compressedPath = await compressImage(imagePath, compressOptions);
    
    let lqip = null;
    if (shouldGenerateLQIP) {
      lqip = await generateLQIP(compressedPath, lqipOptions);
    }

    return { compressedPath, lqip };
  } catch (error) {
    throw new Error(`Image compression with LQIP failed: ${error.message}`);
  }
};

/**
 * Converts absolute file path to relative path from uploads folder
 */
const getRelativePath = (filePath) => {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, '/');
  const uploadsIndex = normalized.indexOf('uploads/');
  if (uploadsIndex !== -1) {
    const path = normalized.substring(uploadsIndex);
    return path.startsWith('/') ? path : '/' + path;
  }
  return normalized.startsWith('/') ? normalized : '/' + normalized;
};

/**
 * Extracts file path from file object and converts to relative path
 */
const getFileRelativePath = (file) => {
  if (!file?.path) return null;
  return getRelativePath(file.path);
};

// ============================================================================
// Middleware Functions
// ============================================================================

/**
 * Middleware to automatically compress uploaded images
 * @param {Object} options - Compression options
 * @returns {Function} - Express middleware
 */
export const compressUploadedImages = (options = {}) => {
  return async (req, res, next) => {
    try {
      if (req.file) {
        await processFile(req.file, (path) => compressImage(path, options));
        // Convert to relative path
        req.file.relativePath = getFileRelativePath(req.file);
      }
      
      if (req.files) {
        await processFiles(req.files, (path) => compressImage(path, options));
        
        // Convert all files to relative paths
        if (Array.isArray(req.files)) {
          req.files.forEach(file => {
            file.relativePath = getFileRelativePath(file);
          });
        } else {
          for (const fieldname in req.files) {
            const files = Array.isArray(req.files[fieldname]) 
              ? req.files[fieldname] 
              : [req.files[fieldname]];
            files.forEach(file => {
              file.relativePath = getFileRelativePath(file);
            });
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to compress uploaded images and generate LQIP
 * @param {Object} options - Compression and LQIP options
 * @returns {Function} - Express middleware
 */
export const compressUploadedImagesWithLQIP = (options = {}) => {
  return async (req, res, next) => {
    try {
      if (req.file) {
        await processFile(req.file, (path) => compressImageWithLQIP(path, options));
        // Convert to relative path
        req.file.relativePath = getFileRelativePath(req.file);
      }
      
      if (req.files) {
        await processFiles(req.files, (path) => compressImageWithLQIP(path, options));
        
        // Convert all files to relative paths
        if (Array.isArray(req.files)) {
          req.files.forEach(file => {
            file.relativePath = getFileRelativePath(file);
          });
        } else {
          for (const fieldname in req.files) {
            const files = Array.isArray(req.files[fieldname]) 
              ? req.files[fieldname] 
              : [req.files[fieldname]];
            files.forEach(file => {
              file.relativePath = getFileRelativePath(file);
            });
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Complete image upload middleware - handles upload, compression, and LQIP
 * Combines multer upload with image processing in one easy-to-use middleware
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.folder - Folder name for uploads (required)
 * @param {string|string[]} config.fields - Field name(s) for file upload (e.g., 'image', ['coverImage', 'images'])
 * @param {number} config.maxCount - Maximum number of files per field (default: 5)
 * @param {boolean} config.generateLQIP - Whether to generate LQIP (default: true)
 * @param {Object} config.compressOptions - Compression options
 * @param {Object} config.lqipOptions - LQIP generation options
 * @param {Object} config.fileFilter - File filter options
 * @returns {Array} - Array of Express middlewares [upload, processing]
 * 
 * @example
 * // Single file
 * router.post('/upload', 
 *   ...imageUpload({ folder: 'products', fields: 'coverImage', generateLQIP: true }),
 *   controller
 * )
 * 
 * @example
 * // Multiple fields
 * router.post('/upload',
 *   ...imageUpload({ 
 *     folder: 'products', 
 *     fields: ['coverImage', 'images'],
 *     maxCount: 5
 *   }),
 *   controller
 * )
 */
export const imageUpload = (config = {}) => {
  const {
    folder,
    fields = 'image',
    maxCount = 5,
    generateLQIP = true,
    compressOptions = {},
    lqipOptions = {},
    fileFilter = {},
    any = false,
    normalizeFieldname
  } = config;

  if (!folder) {
    throw new Error('Folder name is required for imageUpload middleware');
  }

  const uploadMiddleware = upload({ folder, fileFilter, normalizeFieldname });

  let multerHandler;
  if (any === true) {
    // Accept ANY file field; the controller is responsible for sorting them out.
    multerHandler = uploadMiddleware.any();
  } else if (typeof fields === 'string') {
    multerHandler = maxCount === 1
      ? uploadMiddleware.single(fields)
      : uploadMiddleware.array(fields, maxCount);
  } else if (Array.isArray(fields)) {
    const fieldsConfig = fields.map(field => ({
      name: field,
      maxCount: maxCount
    }));
    multerHandler = uploadMiddleware.fields(fieldsConfig);
  } else {
    throw new Error('Fields must be a string or array of strings');
  }

  const processingMiddleware = generateLQIP
    ? compressUploadedImagesWithLQIP({
        ...compressOptions,
        lqipOptions
      })
    : compressUploadedImages(compressOptions);

  return [multerHandler, processingMiddleware];
};

/**
 * Helper function to extract image paths from request
 * Useful in controllers to get processed image paths
 * 
 * @param {Object} req - Express request object
 * @param {string|string[]} fieldNames - Field name(s) to extract
 * @returns {Object} - Object with image paths and LQIP data
 * 
 * @example
 * const { coverImage, coverImageLQIP, images, imagesLQIP } = extractImagePaths(req, ['coverImage', 'images'])
 */
export const extractImagePaths = (req, fieldNames = 'image') => {
  const result = {};
  const fields = Array.isArray(fieldNames) ? fieldNames : [fieldNames];

  fields.forEach(fieldName => {
    // Check single file
    if (req.file && req.file.fieldname === fieldName) {
      result[fieldName] = req.file.relativePath || getFileRelativePath(req.file);
      result[`${fieldName}LQIP`] = req.file.lqip || null;
      return;
    }

    // Check files array
    if (req.files) {
      if (Array.isArray(req.files)) {
        // All files are in one array
        const fieldFiles = req.files.filter(f => f.fieldname === fieldName);
        if (fieldFiles.length > 0) {
          result[fieldName] = fieldFiles.map(f => f.relativePath || getFileRelativePath(f));
          result[`${fieldName}LQIP`] = fieldFiles.map(f => f.lqip || null);
        }
      } else if (req.files[fieldName]) {
        // Field-specific files
        const fieldFiles = Array.isArray(req.files[fieldName]) 
          ? req.files[fieldName] 
          : [req.files[fieldName]];
        
        if (fieldFiles.length > 0) {
          result[fieldName] = fieldFiles.map(f => f.relativePath || getFileRelativePath(f));
          result[`${fieldName}LQIP`] = fieldFiles.map(f => f.lqip || null);
        }
      }
    }

    // Set defaults if not found
    if (!result[fieldName]) {
      result[fieldName] = null;
      result[`${fieldName}LQIP`] = null;
    }
  });

  return result;
};

/**
 * Helper function to get single image path
 * @param {Object} req - Express request object
 * @param {string} fieldName - Field name (default: 'image')
 * @returns {Object} - { path, lqip }
 */
export const getSingleImage = (req, fieldName = 'image') => {
  const extracted = extractImagePaths(req, fieldName);
  return {
    path: extracted[fieldName] || null,
    lqip: extracted[`${fieldName}LQIP`] || null
  };
};

/**
 * Helper function to get multiple image paths
 * @param {Object} req - Express request object
 * @param {string} fieldName - Field name (default: 'images')
 * @returns {Object} - { paths: [], lqips: [] }
 */
export const getMultipleImages = (req, fieldName = 'images') => {
  const extracted = extractImagePaths(req, fieldName);
  const paths = Array.isArray(extracted[fieldName]) 
    ? extracted[fieldName] 
    : (extracted[fieldName] ? [extracted[fieldName]] : []);
  const lqips = Array.isArray(extracted[`${fieldName}LQIP`]) 
    ? extracted[`${fieldName}LQIP`] 
    : (extracted[`${fieldName}LQIP`] ? [extracted[`${fieldName}LQIP`]] : []);

  return {
    paths,
    lqips
  };
};
