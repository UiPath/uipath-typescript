import { BaseOptions } from '../common/types';
import type { BucketGetUriResponse } from './buckets.types';

/**
 * Attachment response from the API
 */
export interface AttachmentResponse {
  /**
   * UUID of the attachment
   */
  id: string;

  /**
   * Name of the attachment
   */
  name: string;

  /**
   * Optional job key to link the attachment to a job when creating it.
   */
  jobKey?: string;

  /**
   * Optional category for the attachment when linking to a job.
   */
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
export interface AttachmentGetByIdOptions extends BaseOptions {}
