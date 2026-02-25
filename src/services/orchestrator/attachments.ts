import { FolderScopedService } from '../folder-scoped';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution';
import { TokenManager } from '../../core/auth/token-manager';
import { ValidationError, HttpStatus } from '../../core/errors';
import {
  AttachmentResponse,
  AttachmentGetByIdOptions,
  AttachmentCreateOptions,
  AttachmentCreateResponse,
  AttachmentDeleteResponse
} from '../../models/orchestrator/attachments.types';
import { AttachmentServiceModel } from '../../models/orchestrator/attachments.models';
import { pascalToCamelCaseKeys, addPrefixToKeys } from '../../utils/transform';
import { createHeaders } from '../../utils/http/headers';
import { ATTACHMENT_ENDPOINTS } from '../../utils/constants/endpoints';
import { ODATA_PREFIX } from '../../utils/constants/common';
import { track } from '../../core/telemetry';

export class AttachmentService extends FolderScopedService implements AttachmentServiceModel {
  protected readonly tokenManager: TokenManager;

  /**
   * @hideconstructor
   */
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
    this.tokenManager = tokenManager;
  }

  /**
   * Gets an attachment by ID
   * @param id - The UUID of the attachment to retrieve
   * @param options - Optional query parameters (expand, select)
   * @returns Promise resolving to the attachment
   *
   * @example
   * ```typescript
   * // Get attachment by ID
   * const attachment = await sdk.attachments.getById('12345678-1234-1234-1234-123456789abc');
   * ```
   */
  @track('Attachments.GetById')
  async getById(id: string, options: AttachmentGetByIdOptions = {}): Promise<AttachmentResponse> {
    if (!id) {
      throw new ValidationError({ message: 'id is required for getById' });
    }

    // Prefix all keys in options with $ for OData
    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, keysToPrefix);

    const response = await this.get<AttachmentResponse>(
      ATTACHMENT_ENDPOINTS.GET_BY_ID(id),
      {
        params: apiOptions,
        headers: createHeaders({})
      }
    );

    // Transform response from PascalCase to camelCase
    return pascalToCamelCaseKeys(response.data) as AttachmentResponse;
  }

  /**
   * Creates a new attachment
   *
   * @param options - Options for creating the attachment
   * @returns Promise resolving to the created attachment
   *
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
  @track('Attachments.Create')
  async create(options: AttachmentCreateOptions): Promise<AttachmentCreateResponse> {
    const { name, jobKey, attachmentCategory } = options;

    if (!name) {
      throw new ValidationError({ message: 'name is required for create' });
    }

    if (name.length > 256) {
      throw new ValidationError({ message: 'name must not exceed 256 characters' });
    }

    if (attachmentCategory && attachmentCategory.length > 128) {
      throw new ValidationError({ message: 'attachmentCategory must not exceed 128 characters' });
    }

    // Build request body with PascalCase keys as expected by the API
    const requestBody: Record<string, any> = {
      Name: name
    };

    if (jobKey) {
      requestBody.JobKey = jobKey;
    }

    if (attachmentCategory) {
      requestBody.AttachmentCategory = attachmentCategory;
    }

    const response = await this.post<AttachmentCreateResponse>(
      ATTACHMENT_ENDPOINTS.CREATE,
      requestBody,
      {
        headers: createHeaders({})
      }
    );

    // Transform response from PascalCase to camelCase
    return pascalToCamelCaseKeys(response.data) as AttachmentCreateResponse;
  }
}
