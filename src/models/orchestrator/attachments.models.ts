import {
  AttachmentResponse,
  AttachmentGetByIdOptions,
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
   * // Get attachment by ID
   * const attachment = await sdk.attachments.getById('12345678-1234-1234-1234-123456789abc');
   * ```
   */
  getById(id: string, options?: AttachmentGetByIdOptions): Promise<AttachmentResponse>;
}
