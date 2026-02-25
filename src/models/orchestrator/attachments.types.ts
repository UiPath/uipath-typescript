import { BaseOptions, BucketGetUriResponse } from "../common/types";

/**
 * Attachment response from the API
 */
export interface AttachmentResponse {
  id: string;
  /**
   * Name of the attachment
   */
  name: string;

  jobKey?: string;

  attachmentCategory?: string;

  /**
   * When the attachment was last modified
   */
  lastModifiedTime?: string;

  /**
   * User ID who last modified the attachment
   */
  lastModifierUserId?: number;

  /**
   * When the attachment was created
   */
  createdTime?: string;

  /**
   * User ID who created the attachment
   */
  creatorUserId?: number;

  blobFileAccess: BucketGetUriResponse;
}

/**
 * Options for getting an attachment by ID
 */
export type AttachmentGetByIdOptions = BaseOptions;
