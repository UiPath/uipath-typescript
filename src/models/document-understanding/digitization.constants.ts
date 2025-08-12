/**
 * Constants for Document Understanding Digitization Service
 */

/**
 * MIME type constants for supported document formats
 */
export const MIME_TYPES = {
  PDF: 'application/pdf',
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  JPG: 'image/jpg',
  TIFF: 'image/tiff',
  BMP: 'image/bmp'
} as const;

/**
 * Mapping of MIME types to file extensions
 * Supports: .pdf, .png, .jpg, .jpeg, .jpe, .tiff, .tif, .bmp
 */
export const MIME_TO_EXTENSION: Record<string, string> = {
  [MIME_TYPES.PDF]: 'pdf',
  [MIME_TYPES.PNG]: 'png',
  [MIME_TYPES.JPEG]: 'jpg',  // Default for JPEG (also supports .jpe, .jpeg)
  [MIME_TYPES.JPG]: 'jpg',
  [MIME_TYPES.TIFF]: 'tiff', // Default for TIFF (also supports .tif)
  [MIME_TYPES.BMP]: 'bmp'
};

/**
 * Default content type when detection fails
 */
export const DEFAULT_CONTENT_TYPE = MIME_TYPES.PDF;

/**
 * Document Understanding Digitization API version
 */
export const DU_DIGITIZATION_API_VERSION = '1.1';