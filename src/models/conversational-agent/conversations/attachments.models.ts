/**
 * Attachment Service Model
 */

import type { ConversationId } from './common.types';
import type {
  AttachmentCreateResponse,
  AttachmentUploadResponse
} from './attachments.types';

/**
 * Service for attachment operations within conversations
 *
 * Attachments allow files to be uploaded and referenced in conversation messages.
 *
 * ### Usage
 *
 * ```typescript
 * const uploadedAttachment = await conversationalAgentService.conversations.attachments.upload(conversationId, file);
 * ```
 */
export interface AttachmentServiceModel {
  /**
   * Creates an attachment entry for a conversation
   *
   * Creates the attachment entry and returns upload access details.
   * The client must handle the file upload using the returned fileUploadAccess.
   * For most cases, use `upload()` instead which handles both steps.
   *
   * @param conversationId - The conversation to attach the file to
   * @param fileName - The name of the file
   * @returns Promise resolving to attachment details with upload access
   * {@link AttachmentCreateResponse}
   * @example
   * ```typescript
   * const attachmentEntry = await conversationalAgentService.conversations.attachments.create(
   *   conversationId,
   *   'document.pdf'
   * );
   *
   * // Handle upload manually using attachmentEntry.fileUploadAccess
   * const { url, verb, headers } = attachmentEntry.fileUploadAccess;
   * ```
   */
  create(conversationId: ConversationId, fileName: string): Promise<AttachmentCreateResponse>;

  /**
   * Uploads a file attachment to a conversation
   *
   * Convenience method that creates the attachment entry and uploads
   * the file content in one step.
   *
   * @param conversationId - The conversation to attach the file to
   * @param file - The file to upload
   * @returns Promise resolving to attachment metadata with URI
   * {@link AttachmentUploadResponse}
   * @example
   * ```typescript
   * const uploadedAttachment = await conversationalAgentService.conversations.attachments.upload(
   *   conversationId,
   *   file
   * );
   * console.log(`Uploaded: ${uploadedAttachment.uri}`);
   * ```
   */
  upload(conversationId: ConversationId, file: File): Promise<AttachmentUploadResponse>;
}
