/**
 * Types for Attachment Service
 */

// ==================== Attachment Types ====================

/**
 * Response for initializing a file attachment
 */
export interface AttachmentInitializeResponse {
  uri: string;
  name: string;
  fileUploadAccess: {
    url: string;
    verb: string;
    headers: { keys: string[]; values: string[] };
    requiresAuth?: boolean;
  };
}

/**
 * Response for uploading an attachment
 */
export interface AttachmentUploadResponse {
  uri: string;
  name: string;
  mimeType: string;
}
