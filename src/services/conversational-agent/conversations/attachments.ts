/**
 * AttachmentService - Attachment operations for Conversations
 *
 * Attachments allow files to be uploaded and referenced in conversation messages.
 * Files are stored in external blob storage and referenced by URI in messages.
 */

// Core SDK imports
import type { IUiPathSDK } from '@/core/types';
import { NetworkError } from '@/core/errors';
import { track } from '@/core/telemetry';
import { BaseService } from '@/services/base';

// Models
import type {
  AttachmentCreateResponse,
  AttachmentServiceModel,
  AttachmentUploadResponse,
  ConversationId
} from '@/models/conversational-agent';

// Utils
import { ATTACHMENT_ENDPOINTS } from '@/utils/constants/endpoints';

/**
 * Service for attachment operations within a conversation
 *
 * Provides methods to create and upload file attachments that can be
 * referenced in conversation messages. Supports both two-step creation
 * (for custom upload handling) and one-step upload convenience method.
 *
 * @example
 * ```typescript
 * import { Attachments } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const attachmentsService = new Attachments(sdk);
 *
 * // One-step upload (recommended for most cases)
 * const uploadedAttachment = await attachmentsService.upload(conversationId, file);
 * console.log(`Uploaded: ${uploadedAttachment.uri}`);
 *
 * // Two-step create (for custom upload handling)
 * const attachmentEntry = await attachmentsService.create(conversationId, 'document.pdf');
 * // Handle upload manually using attachmentEntry.fileUploadAccess
 * ```
 */
export class AttachmentService extends BaseService implements AttachmentServiceModel {
  /**
   * Creates a new AttachmentService instance
   * @param instance - UiPath SDK instance
   */
  constructor(instance: IUiPathSDK) {
    super(instance);
  }

  /**
   * Creates an attachment entry for a conversation
   *
   * Creates the attachment entry and returns upload access details.
   * The client must handle the file upload using the returned fileUploadAccess.
   * For most cases, use `upload()` instead which handles both steps.
   *
   * @param conversationId - The id of the conversation that the attachment will be accessible within
   * @param fileName - The name of the file
   * @returns Promise resolving to the attachment creation response including URI, name, and access details for the client to perform the upload
   *
   * @example
   * ```typescript
   * const attachmentEntry = await attachmentsService.create(conversationId, 'document.pdf');
   * // Use attachmentEntry.fileUploadAccess to upload file content manually
   * ```
   */
  @track('ConversationalAgent.Attachments.Create')
  async create(
    conversationId: ConversationId,
    fileName: string
  ): Promise<AttachmentCreateResponse> {
    const response = await this.post<AttachmentCreateResponse>(
      ATTACHMENT_ENDPOINTS.CREATE(conversationId),
      { name: fileName }
    );
    return response.data;
  }

  /**
   * Uploads a file attachment to a conversation
   *
   * Convenience method that creates the attachment entry and uploads
   * the file content in one step.
   *
   * @param conversationId - The conversation to attach the file to
   * @param file - The file to upload
   * @returns Promise resolving to the attachment metadata with URI for referencing
   *
   * @example
   * ```typescript
   * const attachment = await attachmentsService.upload(conversationId, file);
   * console.log(`Uploaded: ${attachment.uri}`);
   * ```
   */
  @track('ConversationalAgent.Attachments.Upload')
  async upload(
    conversationId: ConversationId,
    file: File
  ): Promise<AttachmentUploadResponse> {
    // Step 1: Create attachment entry and get upload URL
    const { fileUploadAccess, uri, name } = await this.create(conversationId, file.name);

    // Step 2: Upload file to blob storage
    const uploadHeaders: Record<string, string> = {
      'Content-Type': file.type
    };

    // Add custom headers from API response
    fileUploadAccess.headers.keys.forEach((key, index) => {
      uploadHeaders[key] = fileUploadAccess.headers.values[index];
    });

    // Add auth header if required by the storage endpoint
    if (fileUploadAccess.requiresAuth) {
      const token = await this.getValidAuthToken();
      uploadHeaders['Authorization'] = `Bearer ${token}`;
    }

    const uploadResponse = await fetch(fileUploadAccess.url, {
      method: fileUploadAccess.verb,
      body: file,
      headers: uploadHeaders
    });

    if (!uploadResponse.ok) {
      throw new NetworkError({
        message: `Failed to upload to file storage: ${uploadResponse.status} ${uploadResponse.statusText}`,
        statusCode: uploadResponse.status
      });
    }

    return {
      uri,
      name,
      mimeType: file.type
    };
  }
}
