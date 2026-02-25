import { FolderScopedService } from '../../folder-scoped';
import { ValidationError } from '../../../core/errors';
import {
  AttachmentResponse,
  AttachmentGetByIdOptions,
} from '../../../models/orchestrator/attachments.types';
import { AttachmentServiceModel } from '../../../models/orchestrator/attachments.models';
import { pascalToCamelCaseKeys, addPrefixToKeys, transformData } from '../../../utils/transform';
import { createHeaders } from '../../../utils/http/headers';
import { JOB_ATTACHMENT_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PREFIX } from '../../../utils/constants/common';
import { track } from '../../../core/telemetry';
import { AttachmentsMap } from '../../../models/orchestrator/attachments.constants';

export class AttachmentService extends FolderScopedService implements AttachmentServiceModel {
  /**
   * Gets an attachment by ID
   * @param id - The UUID of the attachment to retrieve
   * @param options - Optional query parameters (expand, select)
   * @returns Promise resolving to the attachment
   *
   * @example
   * ```typescript
   * import { Attachments } from '@uipath/uipath-typescript/attachments';
   *
   * const attachments = new Attachments(sdk);
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
      JOB_ATTACHMENT_ENDPOINTS.GET_BY_ID(id),
      {
        params: apiOptions,
        headers: createHeaders({})
      }
    );

    // Transform response from PascalCase to camelCase
    return transformData(pascalToCamelCaseKeys(response.data) as AttachmentResponse, AttachmentsMap);
  }
}
