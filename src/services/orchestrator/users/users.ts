import { track } from '../../../core/telemetry';
import type { OrchestratorUserGetAllOptions, OrchestratorUserGetResponse } from '../../../models/orchestrator/users.types';
import type { OrchestratorUserServiceModel } from '../../../models/orchestrator/users.models';
import { ORCHESTRATOR_USER_DROPPED_FIELDS, type RawOrchestratorUserDto } from '../../../models/orchestrator/users.internal-types';
import { OrchestratorUserMap } from '../../../models/orchestrator/users.constants';
import { ORCHESTRATOR_USER_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_OFFSET_PARAMS, ODATA_PAGINATION } from '../../../utils/constants/common';
import { pascalToCamelCaseKeys, transformData, transformOptions } from '../../../utils/transform';
import type { HasPaginationOptions, NonPaginatedResponse, PaginatedResponse } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { BaseService } from '../../base';

/**
 * Service for listing UiPath Orchestrator users.
 *
 * This service is tenant-level — no folder headers are sent on requests.
 */
export class OrchestratorUserService extends BaseService implements OrchestratorUserServiceModel {
  @track('OrchestratorUsers.GetAll')
  async getAll<T extends OrchestratorUserGetAllOptions = OrchestratorUserGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<OrchestratorUserGetResponse>
      : NonPaginatedResponse<OrchestratorUserGetResponse>
  > {
    // Rewrite renamed SDK field names → API names inside OData strings before delegating.
    const apiOptions = options ? transformOptions(options, OrchestratorUserMap) : options;

    return PaginationHelpers.getAll<T, RawOrchestratorUserDto, OrchestratorUserGetResponse>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => ORCHESTRATOR_USER_ENDPOINTS.GET_ALL,
      transformFn: transformOrchestratorUser,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: ODATA_PAGINATION.ITEMS_FIELD,
        totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: ODATA_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: ODATA_OFFSET_PARAMS.COUNT_PARAM,
        },
      },
    }, apiOptions);
  }
}

/**
 * Drops the wire-only fields, camelCases every key (including nested `userRoles`)
 * and applies the SDK field renames.
 */
function transformOrchestratorUser(raw: RawOrchestratorUserDto): OrchestratorUserGetResponse {
  const stripped: Record<string, unknown> = { ...raw };
  for (const field of ORCHESTRATOR_USER_DROPPED_FIELDS) {
    delete stripped[field];
  }
  return transformData(pascalToCamelCaseKeys(stripped), OrchestratorUserMap) as OrchestratorUserGetResponse;
}
