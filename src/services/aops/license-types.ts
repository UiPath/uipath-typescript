import { BaseService } from '../base';
import { LicenseType } from '../../models/aops/license-types.types';
import {
  LicenseTypeServiceModel,
  LicenseTypeGetAllResponse,
} from '../../models/aops/license-types.models';
import { LICENSE_TYPE_ENDPOINTS } from '../../utils/constants/endpoints/aops';
import { track } from '../../core/telemetry';

/**
 * Service for interacting with UiPath License Type API
 *
 * Provides methods for retrieving license types available in the
 * UiPath Autonomous Operations (AoPS) platform.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { LicenseTypes } from '@uipath/uipath-typescript/policies';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const licenseTypes = new LicenseTypes(sdk);
 *
 * // Get all license types
 * const allLicenseTypes = await licenseTypes.getAll();
 * ```
 */
export class LicenseTypeService extends BaseService implements LicenseTypeServiceModel {
  /**
   * Gets all license types
   *
   * @returns Promise resolving to array of license types
   *
   * @example
   * ```typescript
   * import { LicenseTypes } from '@uipath/uipath-typescript/policies';
   *
   * const licenseTypes = new LicenseTypes(sdk);
   *
   * // Get all license types
   * const allLicenseTypes = await licenseTypes.getAll();
   * console.log(allLicenseTypes.map(lt => lt.label));
   * ```
   */
  @track('LicenseTypes.GetAll')
  async getAll(): Promise<LicenseType[]> {
    const response = await this.get<LicenseTypeGetAllResponse>(
      LICENSE_TYPE_ENDPOINTS.GET_ALL
    );
    return response.data;
  }
}
