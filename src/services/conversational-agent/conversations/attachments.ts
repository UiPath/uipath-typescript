/**
 * Attachment operations for Conversations
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
  AttachmentCreateApiResponse,
  AttachmentOperationsServiceModel,
  AttachmentUploadResponse,
  ConversationId
} from '@/models/conversational';

// Utils
import { ATTACHMENT_ENDPOINTS } from '@/utils/constants/endpoints';

/**
 * Output fields when initializing a file attachment
 */
export interface InitializeFileOutput extends AttachmentCreateApiResponse {}

/**
 * Service for attachment operations within a conversation
 *
 * Provides methods to initialize and upload file attachments that can be
 * referenced in conversation messages. Supports both two-step initialization
 * (for custom upload handling) and one-step upload convenience method.
 *
 * @example
 * ```typescript
 * // One-step upload (recommended for most cases)
 * const attachment = await conversations.attachments.upload(
 *   conversationId,
 *   file
 * );
 * console.log(`Uploaded: ${attachment.uri}`);
 *
 * // Two-step initialize (for custom upload handling)
 * const initResult = await conversations.attachments.initialize(
 *   conversationId,
 *   'document.pdf'
 * );
 * // Handle upload manually using initResult.fileUploadAccess
 * ```
 */
export class AttachmentOperations extends BaseService implements AttachmentOperationsServiceModel {
  /**
   * Creates a new AttachmentOperations instance
   * @param instance - UiPath SDK instance
   */
  constructor(instance: IUiPathSDK) {
    super(instance);
  }

  /**
   * Initialize a file attachment for the conversation. Creates the attachment entry and returns
   * the upload details, without uploading any file content. The client must handle the file
   * upload using the returned fileUploadAccess details.
   *
   * @param conversationId - The id of the conversation that the attachment will be accessible within
   * @param fileName - The name of the file to initialize
   * @returns The attachment creation response including URI, name, and access details for the client to perform the upload
   */
  @track('Attachments.Initialize')
  async initialize(
    conversationId: ConversationId,
    fileName: string
  ): Promise<InitializeFileOutput> {
    const response = await this.post<InitializeFileOutput>(
      ATTACHMENT_ENDPOINTS.CREATE(conversationId),
      { name: fileName }
    );
    return response.data;
  }

  /**
   * Creates an attachment by uploading a file to a conversation. Both initializes the attachment
   * and uploads the file contents to the attachment's storage URL.
   *
   * @param conversationId - The conversation to attach the file to
   * @param file - The file to upload
   * @returns The attachment metadata with URI for referencing
   */
  @track('Attachments.Upload')
  async upload(
    conversationId: ConversationId,
    file: File
  ): Promise<AttachmentUploadResponse> {
    // Step 1: Create attachment record and get upload URL
    const createResponse = await this.post<AttachmentCreateApiResponse>(
      ATTACHMENT_ENDPOINTS.CREATE(conversationId),
      { name: file.name }
    );

    const { fileUploadAccess, uri, name } = createResponse.data;

    // Step 2: Upload file to blob storage
    const uploadHeaders: Record<string, string> = {
      'Content-Type': file.type
    };

    // Add custom headers from API response
    fileUploadAccess.headers.keys.forEach((key, index) => {
      uploadHeaders[key] = fileUploadAccess.headers.values[index];
    });

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
