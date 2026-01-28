/**
 * Types for Attachment Service
 */

// ==================== Attachment Types ====================

/**
 * Response for creating a file attachment entry
 *
 * Contains the attachment URI and upload access details for uploading
 * the file content to blob storage.
 */
export interface AttachmentCreateResponse {
  /** URI to reference this attachment in messages */
  uri: string;
  /** File name */
  name: string;
  /** Details for uploading the file content */
  fileUploadAccess: {
    /** URL to upload the file to */
    url: string;
    /** HTTP verb to use (e.g., 'PUT') */
    verb: string;
    /** Headers to include in the upload request */
    headers: { keys: string[]; values: string[] };
    /** Whether authentication is required for the upload */
    requiresAuth?: boolean;
  };
}

/**
 * Response for uploading an attachment (after file content is uploaded)
 */
export interface AttachmentUploadResponse {
  /** URI to reference this attachment in messages */
  uri: string;
  /** File name */
  name: string;
  /** MIME type of the uploaded file */
  mimeType: string;
}
