import {
  AttachmentResponse,
  AttachmentGetByIdOptions,
  AttachmentCreateOptions,
  AttachmentCreateResponse,
  AttachmentDeleteResponse
} from './attachments.types';

/**
 * Service for managing UiPath Orchestrator Attachments.
 *
 * Attachments are files that can be associated with jobs and other entities in Orchestrator.
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
   * // Get attachment by ID
   * const attachment = await sdk.attachments.getById('12345678-1234-1234-1234-123456789abc');
   * ```
   */
  getById(id: string, options?: AttachmentGetByIdOptions): Promise<AttachmentResponse>;

  /**
   * Creates a new attachment
   *
   * @param options - Options for creating the attachment
   * @returns Promise resolving to the created attachment
   * {@link AttachmentCreateResponse}
   * @example
   * ```typescript
   * // Create a simple attachment
   * const attachment = await sdk.attachments.create({
   *   name: 'MyAttachment.pdf'
   * });
   *
   * // Create an attachment linked to a job
   * const attachment = await sdk.attachments.create({
   *   name: 'JobOutput.xlsx',
   *   jobKey: '12345678-1234-1234-1234-123456789abc',
   *   attachmentCategory: 'Output'
   * });
   * ```
   */
  create(options: AttachmentCreateOptions): Promise<AttachmentCreateResponse>;
}
