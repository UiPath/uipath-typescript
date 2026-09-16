import { track } from '../../../core/telemetry';
import { NotFoundError, ValidationError } from '../../../core/errors';
import type { CollectionResponse } from '../../../models/common/types';
import type { FolderGetByKeyOptions, FolderGetResponse } from '../../../models/orchestrator/folders.types';
import type { FolderServiceModel } from '../../../models/orchestrator/folders.models';
import { FOLDER_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PREFIX } from '../../../utils/constants/common';
import { addPrefixToKeys, pascalToCamelCaseKeys } from '../../../utils/transform';
import { GUID_REGEX } from '../../../utils/validation/guid';
import { BaseService } from '../../base';

/**
 * Service for looking up UiPath Orchestrator folders.
 *
 * The `odata/Folders` collection is not folder-scoped, so this service extends
 * {@link BaseService} directly and sends no folder headers.
 */
export class FolderService extends BaseService implements FolderServiceModel {
  @track('Folders.GetByKey')
  async getByKey(key: string, options: FolderGetByKeyOptions = {}): Promise<FolderGetResponse> {
    const trimmedKey = key?.trim();
    if (!trimmedKey || !GUID_REGEX.test(trimmedKey)) {
      throw new ValidationError({ message: 'Folders.getByKey: key must be a GUID.' });
    }

    const apiOptions = {
      ...addPrefixToKeys(options, ODATA_PREFIX, Object.keys(options)),
      '$filter': `Key eq ${trimmedKey}`,
      '$top': '1',
    };

    const response = await this.get<CollectionResponse<Record<string, unknown>>>(FOLDER_ENDPOINTS.GET_ALL, {
      params: apiOptions,
    });

    const items = response.data?.value;
    if (!items?.length) {
      throw new NotFoundError({ message: `Folder with key '${trimmedKey}' not found.` });
    }

    return pascalToCamelCaseKeys(items[0]) as FolderGetResponse;
  }
}
