import { ValidationError } from '../../../core/errors';
import {
  AttachmentResponse,
  AttachmentGetByIdOptions,
} from '../../../models/orchestrator/attachments.types';
import { AttachmentServiceModel } from '../../../models/orchestrator/attachments.models';
import { pascalToCamelCaseKeys, addPrefixToKeys, transformData, transformOptions } from '../../../utils/transform';
import { ORCHESTRATOR_ATTACHMENT_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PREFIX } from '../../../utils/constants/common';
import { track } from '../../../core/telemetry';
import { AttachmentsMap } from '../../../models/orchestrator/attachments.constants';
import { BaseService } from '../../..//services/base';
import { BucketMap } from '../../../models/orchestrator/buckets.constants';

export class AttachmentService extends BaseService implements AttachmentServiceModel {
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
   * const attachment = await attachments.getById('12345678-1234-1234-1234-123456789abc');
   * ```
   */
  @track('Attachments.GetById')
  async getById(id: string, options: AttachmentGetByIdOptions = {}): Promise<AttachmentResponse> {
    if (!id) {
      throw new ValidationError({ message: 'id is required for getById' });
    }

    // Response applies both maps (BucketMap on blobFileAccess, AttachmentsMap on top-level);
    // merge so SDK names from either are rewritten in one pass.
    const apiFieldOptions = transformOptions(options, { ...AttachmentsMap, ...BucketMap });
    const apiOptions = addPrefixToKeys(apiFieldOptions, ODATA_PREFIX, Object.keys(apiFieldOptions));

    const response = await this.get<AttachmentResponse>(
      ORCHESTRATOR_ATTACHMENT_ENDPOINTS.GET_BY_ID(id),
      {
        params: apiOptions,
      }
    );

    // Transform response from PascalCase to camelCase, then apply field maps
    const camelCased = pascalToCamelCaseKeys(response.data) as AttachmentResponse;
    camelCased.blobFileAccess = transformData(camelCased.blobFileAccess, BucketMap);
    return transformData(camelCased, AttachmentsMap);
  }
}
