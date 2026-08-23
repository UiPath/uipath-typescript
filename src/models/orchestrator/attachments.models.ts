import {
  AttachmentResponse,
  AttachmentGetByIdOptions,
  AttachmentCreateOptions,
  AttachmentCreateResponse,
} from './attachments.types';

/**
 * Service for managing UiPath Orchestrator Attachments.
 *
 * Attachments are files that can be associated with Orchestrator jobs.
 */
export interface AttachmentServiceModel {
  /**
   * Gets an attachment by ID
   *
   * @param id - The UUID of the attachment to retrieve
   * @param options - Optional query parameters (expand, select)
   * @returns Promise resolving to the attachment
   * {@link AttachmentResponse}
   * @example
   * ```typescript
   * import { Attachments } from '@uipath/uipath-typescript/attachments';
   *
   * const attachments = new Attachments(sdk);
   * const attachment = await attachments.getById('12345678-1234-1234-1234-123456789abc');
   * ```
   */
  getById(id: string, options?: AttachmentGetByIdOptions): Promise<AttachmentResponse>;

  /**
   * Creates an attachment and uploads its content.
   *
   * The upload is handled for you — the attachment record and its file are both
   * in place once this resolves. Returns the stored attachment, whose `id` is
   * the handle to use everywhere else (for example as the value of a `file`
   * field in an action's output data).
   *
   * Pass `jobKey` to link the attachment to a job as part of the same call;
   * `jobs.linkAttachment()` is only needed to attach it to a further job later.
   *
   * @param name - File name to store the attachment under, including its extension
   * @param content - File content to upload
   * @param options - Optional job to link to, its category, and the folder to create the attachment in
   * @returns Promise resolving to the created {@link AttachmentCreateResponse}
   * @example
   * ```typescript
   * import { Attachments } from '@uipath/uipath-typescript/attachments';
   *
   * const attachments = new Attachments(sdk);
   *
   * // Upload a file picked in the browser
   * const attachment = await attachments.create(file.name, file);
   * console.log(attachment.id);
   * ```
   * @example
   * ```typescript
   * // Upload and link it to a job in one call
   * const attachment = await attachments.create('invoice.pdf', file, {
   *   jobKey: <jobKey>,
   *   category: 'Invoice',
   * });
   * ```
   */
  create(
    name: string,
    content: Blob | Uint8Array<ArrayBuffer> | File,
    options?: AttachmentCreateOptions
  ): Promise<AttachmentCreateResponse>;
}
