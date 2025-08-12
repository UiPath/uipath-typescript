import { BaseService } from '../base-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { TokenManager } from '../../core/auth/token-manager';
import { 
  DigitizationServiceModel 
} from '../../models/document-understanding/digitization.models';
import { 
  StartDigitizationOptions, 
  StartDigitizationResponse 
} from '../../models/document-understanding/digitization.types';
import { 
  MIME_TYPES,
  MIME_TO_EXTENSION, 
  DEFAULT_CONTENT_TYPE ,
  DU_DIGITIZATION_API_VERSION
} from '../../models/document-understanding/digitization.constants';
import { DOCUMENT_ENDPOINTS } from '../../utils/constants/endpoints';
import { isBrowser } from '../../utils/platform';
import { createHeaders, createParams } from '../../utils/http/headers';
import { PAGE_RANGE } from '../../utils/constants/headers';
import { API_VERSION } from '../../utils/constants/params';

/**
 * Service for interacting with UiPath Document Understanding Digitization API
 */
export class DigitizationService extends BaseService implements DigitizationServiceModel {
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  /**
   * Gets the file extension for a given MIME type
   * Supports: .png, .jpe, .jpg, .jpeg, .tiff, .tif, .bmp, .pdf
   */
  private _getExtensionForMimeType(mimeType: string): string {
    return MIME_TO_EXTENSION[mimeType] || 'pdf';
  }

  /**
   * Generates a filename based on the detected content type
   * Ensures the filename has the correct extension
   */
  private _generateFilename(providedFilename: string | undefined, file: Buffer | Blob | File, contentType: string): string {
    const extension = this._getExtensionForMimeType(contentType);
    
    // If it's a File object and no filename provided, use the file's name
    if (!providedFilename && file instanceof File && file.name) {
      const fileName = file.name;
      const lastDotIndex = fileName.lastIndexOf('.');
      const nameWithoutExt = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
      return `${nameWithoutExt}.${extension}`;
    }
    
    // If filename is provided, use it with correct extension
    if (providedFilename) {
      const lastDotIndex = providedFilename.lastIndexOf('.');
      const nameWithoutExt = lastDotIndex > 0 ? providedFilename.substring(0, lastDotIndex) : providedFilename;
      return `${nameWithoutExt}.${extension}`;
    }
    
    // Generate a unique filename with timestamp
    const timestamp = Date.now();
    return `document_${timestamp}.${extension}`;
  }

  /**
   * Detects MIME type from buffer using magic bytes
   * Used as fallback when file-type module is not available
   */
  private _detectContentTypeFromMagicBytes(buffer: Buffer): string {
    const magicBytes = buffer.subarray(0, 12);
    
    // PDF: starts with %PDF
    if (magicBytes.subarray(0, 4).toString() === '%PDF') {
      return MIME_TYPES.PDF;
    }
    
    // PNG: starts with 89 50 4E 47
    if (magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && 
        magicBytes[2] === 0x4E && magicBytes[3] === 0x47) {
      return MIME_TYPES.PNG;
    }
    
    // JPEG: starts with FF D8 FF
    if (magicBytes[0] === 0xFF && magicBytes[1] === 0xD8 && magicBytes[2] === 0xFF) {
      return MIME_TYPES.JPEG;
    }
    
    // TIFF: starts with 49 49 2A 00 (little endian) or 4D 4D 00 2A (big endian)
    if ((magicBytes[0] === 0x49 && magicBytes[1] === 0x49 && 
         magicBytes[2] === 0x2A && magicBytes[3] === 0x00) ||
        (magicBytes[0] === 0x4D && magicBytes[1] === 0x4D && 
         magicBytes[2] === 0x00 && magicBytes[3] === 0x2A)) {
      return MIME_TYPES.TIFF;
    }
    
    // BMP: starts with BM
    if (magicBytes[0] === 0x42 && magicBytes[1] === 0x4D) {
      return MIME_TYPES.BMP;
    }
    
    // Default to PDF if no match
    return DEFAULT_CONTENT_TYPE;
  }

  /**
   * Detects the MIME type from file content using file-type module
   * Falls back to magic bytes detection if module unavailable
   */
  private async _detectContentType(file: Buffer | Blob | File): Promise<string> {
    // If it's a File object, it already has a type
    if (file instanceof File && file.type) {
      return file.type;
    }
    
    // If it's a Blob with a type, use it
    if (file instanceof Blob && file.type) {
      return file.type;
    }
    
    // For Buffer, try file-type module first for accurate detection
    if (Buffer.isBuffer(file)) {
      let detectedType: string | null = null;
      
      try {
        const { fileTypeFromBuffer } = await import('file-type');
        const type = await fileTypeFromBuffer(file);
        if (type?.mime) {
          detectedType = type.mime;
        }
      } catch (error) {
        console.warn(
          'file-type module not available or failed to load. ' +
          'Using basic magic bytes detection. ' +
          'For better file type detection, ensure file-type is installed.',
          error instanceof Error ? error.message : error
        );
      }
      
      // Use detected type if available, otherwise fall back to magic bytes
      return detectedType || this._detectContentTypeFromMagicBytes(file);
    }
    
    // Default to PDF
    return DEFAULT_CONTENT_TYPE;
  }

  /**
   * Start digitization process for a document
   * 
   * IMPORTANT LIMITATIONS:
   * - Maximum file size: 160 MB
   * - Maximum pages per document: 500 pages
   * 
   * @param options - Configuration for the digitization request
   * @returns  Promise resolving to digitization response
   * 
   * @example
   * ```typescript
   * // Basic digitization with file buffer (Node.js)
   * import { readFileSync } from 'fs';
   * 
   * const fileBuffer = readFileSync('invoice.pdf');
   * const result = await sdk.documents.digitization.start({
   *   projectId: '00000000-0000-0000-0000-000000000000',
   *   file: fileBuffer,
   *   filename: 'invoice.pdf'  // Optional: provide original filename
   * });
   * console.log('Document ID:', result.documentId);
   * 
   * // Browser example with File object
   * const fileInput = document.getElementById('fileInput') as HTMLInputElement;
   * const file = fileInput.files[0];
   * 
   * const browserResult = await sdk.documents.digitization.start({
   *   projectId: '00000000-0000-0000-0000-000000000000',
   *   file: file
   * });
   * ```
   */
  async start(options: StartDigitizationOptions): Promise<StartDigitizationResponse> {
    const { projectId, file, filename: providedFilename, pageRange } = options;

    const contentType = await this._detectContentType(file);
    
    // Generate filename with correct extension based on detected type
    const filename = this._generateFilename(providedFilename, file, contentType);
    
    // Create FormData instance for multipart/form-data request
    // Required by the API to handle file uploads
    let formData: any;
    
    // Check if we're in Node.js environment and need to use form-data package
    if (!isBrowser && Buffer.isBuffer(file)) {
      try {
        // Dynamic import to avoid issues in browser environments
        const FormDataNode = (await import('form-data')).default;
        formData = new FormDataNode();
        
        formData.append('File', file, {
          filename: filename,
          contentType: contentType
        });
      } catch (e) {
        // Fallback if form-data is not available
        formData = new FormData();
        const blob = new Blob([file], { type: contentType });
        formData.append('File', blob, filename);
      }
    } else {
      // Browser environment or non-Buffer types
      formData = new FormData();
      
      if (file instanceof File) {
        // Browser File object - can be appended directly
        // The browser will use the file's own type
        formData.append('File', file);
      } else if (file instanceof Blob) {
        // Browser Blob object - create new blob with detected type if needed
        const typedBlob = file.type ? file : new Blob([file], { type: contentType });
        formData.append('File', typedBlob, filename);
      } else if (Buffer.isBuffer(file)) {
        // Buffer in browser environment (edge case)
        const blob = new Blob([file], { type: contentType });
        formData.append('File', blob, filename);
      } else {
        throw new Error('Invalid file type. File must be a Buffer, Blob, or File object.');
      }
    }

    // The x-uipath-page-range header is optional and controls which pages to process
    const headers = createHeaders({
      [PAGE_RANGE]: pageRange  // Will be excluded if undefined
    });

    // API version is always 1.1 for Document Understanding
    const params = createParams({
      [API_VERSION]: DU_DIGITIZATION_API_VERSION
    });

    const response = await this.post<StartDigitizationResponse>(
      DOCUMENT_ENDPOINTS.DIGITIZATION.START(projectId),
      formData,
      { 
        headers,
        params
      }
    );

    return response.data;
  }
}