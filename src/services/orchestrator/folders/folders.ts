import { track } from '../../../core/telemetry';
import { ValidationError } from '../../../core/errors';
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
 * The Folders GetByKey action is not folder-scoped, so this service extends
 * {@link BaseService} directly and sends no folder headers.
 */
export class FolderService extends BaseService implements FolderServiceModel {
  @track('Folders.GetByKey')
  async getByKey(key: string, options: FolderGetByKeyOptions = {}): Promise<FolderGetResponse> {
    const trimmedKey = key?.trim();
    if (!trimmedKey || !GUID_REGEX.test(trimmedKey)) {
      throw new ValidationError({ message: 'Folders.getByKey: key must be a GUID.' });
    }

    const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, Object.keys(options));

    const response = await this.get<Record<string, unknown>>(
      FOLDER_ENDPOINTS.GET_BY_KEY(trimmedKey),
      { params: apiOptions },
    );

    return pascalToCamelCaseKeys(response.data) as FolderGetResponse;
  }
}
