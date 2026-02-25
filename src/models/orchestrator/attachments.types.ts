import { BaseOptions } from "../common/types";

/**
 * Attachment response from the API
 */
export interface AttachmentResponse {
  id: string;
  /**
   * Name of the attachment
   */
  name: string;

  jobKey: string;

  attachmentCategory: string;

  /**
   * When the attachment was last modified
   */
  lastModificationTime?: string;

  /**
   * User ID who last modified the attachment
   */
  lastModifierUserId?: number;

  /**
   * When the attachment was created
   */
  creationTime?: string;

  /**
   * User ID who created the attachment
   */
  creatorUserId?: number;

  blobFileAccess: BlobFileAccess;
}

/**
 * Options for getting an attachment by ID
 */
export type AttachmentGetByIdOptions = BaseOptions;

/**
 * Options for creating an attachment
 */
export interface AttachmentCreateOptions {
  /**
   * Name of the attachment (required, max 256 characters)
   */
  name: string;

  /**
   * Optional job key to link the attachment to a job when creating it.
   * This field is only used for input and is not returned in responses.
   */
  jobKey?: string;

  /**
   * Optional category for the attachment when linking to a job.
   * This field is only used for input and is not returned in responses.
   */
  attachmentCategory?: string;
}

/**
 * Response from create attachment operation
 */
export type AttachmentCreateResponse = AttachmentResponse;

/**
 * Response from delete attachment operation
 */
export interface AttachmentDeleteResponse {
  /**
   * Whether the deletion was successful
   */
  success: boolean;

  /**
   * HTTP status code from the delete operation
   */
  statusCode: number;
}

interface BlobFileAccess {
  uri: string;
  verb: string;
  requiresAuth: boolean;
}