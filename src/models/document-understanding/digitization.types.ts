/**
 * Options for starting a digitization process
 */
export interface StartDigitizationOptions {
  /**
   * The unique identifier of the Document Understanding project
   * Format: UUID (e.g., "00000000-0000-0000-0000-000000000000")
   */
  projectId: string;
  
  /**
   * The document file to be digitized
   * Supported formats: .pdf, .png, .jpg, .jpeg, .jpe, .tiff, .tif, .bmp
   * 
   * IMPORTANT LIMITATIONS:
   * - Maximum file size: 160 MB
   * - Maximum pages per document: 500 pages
   */
  file: Buffer | Blob | File;
  
  /**
   * Optional filename for the document
   * If not provided:
   * - For File objects, uses the file's name
   * - For Buffer/Blob, generates "document_{timestamp}.{ext}" based on detected type
   */
  filename?: string;
  
  /**
   * Optional page range specification for partial document processing
   * Examples:
   * - "7" - Single page
   * - "7-12" - Range of pages
   * - "2-5, 7, 15-End" - Complex range
   * - "All" - All pages (default)
   * - "4, 1-2, 7" - Reordered range
   */
  pageRange?: string;
}

/**
 * Response from the digitization start operation
 */
export interface StartDigitizationResponse {
  /**
   * UUID representing the ID of the document that is being digitized
   */
  documentId: string;
}