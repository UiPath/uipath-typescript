import { BaseOptions } from "../common/types";
import type { BucketGetUriResponse } from "./buckets.types";

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
export interface AttachmentGetByIdOptions extends BaseOptions {};

/**
 * Attachment returned when a new attachment is created.
 *
 * The upload URI is deliberately not exposed — the SDK uploads the content
 * before returning, so the short-lived write credential serves no further
 * purpose to the caller.
 */
export interface AttachmentCreateResponse extends Omit<AttachmentResponse, 'blobFileAccess'> {};

/**
 * Options for creating an attachment
 */
export interface AttachmentCreateOptions {
  /**
   * Key of a job to link the new attachment to. When set, the attachment is
   * created and linked in a single call — no separate `jobs.linkAttachment()`
   * is needed.
   */
  jobKey?: string;

  /**
   * Label that groups the attachment within the job. Only meaningful together
   * with `jobKey`.
   */
  category?: string;

  /**
   * ID of the folder to create the attachment in. Defaults to the tenant's
   * default folder context when omitted.
   */
  folderId?: number;
}
