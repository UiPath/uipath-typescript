import { BaseService } from '../base';
import { ChoiceSetServiceModel } from '../../models/data-fabric/choicesets.models';
import {
  ChoiceSetGetAllOptions,
  ChoiceSetGetAllResponse,
  ChoiceSetGetResponse,
  ChoiceSetGetByIdOptions,
  ChoiceSetCreateOptions,
  ChoiceSetUpdateOptions,
  ChoiceSetDeleteByIdOptions,
  ChoiceSetValueInsertOptions,
  ChoiceSetValueInsertResponse,
  ChoiceSetValueUpdateOptions,
  ChoiceSetValueUpdateResponse,
  ChoiceSetValueDeleteOptions,
} from '../../models/data-fabric/choicesets.types';
import { RawChoiceSetGetAllResponse, RawChoiceSetGetResponse } from '../../models/data-fabric/choicesets.internal-types';
import { DATA_FABRIC_ENDPOINTS, DATA_FABRIC_TENANT_FOLDER_ID } from '../../utils/constants/endpoints/data-fabric';
import { FOLDER_KEY } from '../../utils/constants/headers';
import { createHeaders } from '../../utils/http/headers';
import { transformData, pascalToCamelCaseKeys } from '../../utils/transform';
import { EntityMap } from '../../models/data-fabric/entities.constants';
import { track } from '../../core/telemetry';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination/types';
import { PaginationType } from '../../utils/pagination/internal-types';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { CHOICESET_VALUES_PAGINATION, ENTITY_OFFSET_PARAMS, HTTP_METHODS } from '../../utils/constants/common';
import { ValidationError, NotFoundError } from '../../core/errors';

export class ChoiceSetService extends BaseService implements ChoiceSetServiceModel {
  @track('Choicesets.GetAll')
  async getAll(options?: ChoiceSetGetAllOptions): Promise<ChoiceSetGetAllResponse[]> {
    return this.fetchAllChoiceSets(options);
  }

  /**
   * Internal helper that performs the choice-set fetch. Kept separate from the
   * public `getAll()` so that internal callers (e.g. `resolveChoiceSetName`)
   * can reuse it without triggering double `@track` telemetry.
   */
  private async fetchAllChoiceSets(options?: ChoiceSetGetAllOptions): Promise<ChoiceSetGetAllResponse[]> {
    // The choice-set endpoint returns cross-scope results when called without
    // a folder header. To stay tenant-only by default, send the tenant-marker
    // UUID as the folder key unless the caller explicitly opts into cross-scope
    // via includeFolderChoiceSets: true. folderKey is preferred over
    // includeFolderChoiceSets when both are set.
    const folderKey = options?.folderKey
      ?? (options?.includeFolderChoiceSets ? undefined : DATA_FABRIC_TENANT_FOLDER_ID);

    const rawResponse = await this.get<RawChoiceSetGetAllResponse[]>(
      DATA_FABRIC_ENDPOINTS.CHOICESETS.GET_ALL,
      { headers: createHeaders({ [FOLDER_KEY]: folderKey }) }
    );

    // Transform field names
    const data = rawResponse.data || [];
    return data.map(choiceSet =>
      transformData(choiceSet, EntityMap) as unknown as ChoiceSetGetAllResponse
    );
  }

  @track('Choicesets.GetById')
  async getById<T extends ChoiceSetGetByIdOptions = ChoiceSetGetByIdOptions>(
    choiceSetId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
    ? PaginatedResponse<ChoiceSetGetResponse>
    : NonPaginatedResponse<ChoiceSetGetResponse>
  > {
    // Transform a single item from PascalCase to camelCase
    const transformFn = (item: RawChoiceSetGetResponse): ChoiceSetGetResponse => {
      const camelCased = pascalToCamelCaseKeys(item);
      return transformData(camelCased, EntityMap) as ChoiceSetGetResponse;
    };

    // folderKey is header-only — destructure it out so PaginationHelpers doesn't
    // include it in the POST body alongside pagination params.
    const { folderKey, ...rest } = options ?? {};
    const downstreamOptions = options === undefined ? undefined : (rest as T);
    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => DATA_FABRIC_ENDPOINTS.CHOICESETS.GET_BY_ID(choiceSetId),
      transformFn,
      method: HTTP_METHODS.POST,
      headers: createHeaders({ [FOLDER_KEY]: folderKey }),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: CHOICESET_VALUES_PAGINATION.ITEMS_FIELD,
        totalCountField: CHOICESET_VALUES_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ENTITY_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: ENTITY_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: ENTITY_OFFSET_PARAMS.COUNT_PARAM
        }
      }
    }, downstreamOptions);
  }

  @track('Choicesets.Create')
  async create(name: string, options?: ChoiceSetCreateOptions): Promise<string> {
    const opts = options ?? {};
    const payload = {
      ...(opts.description !== undefined && { description: opts.description }),
      ...(opts.displayName !== undefined && { displayName: opts.displayName }),
      entityDefinition: {
        name,
        fields: [],
        folderId: opts.folderKey ?? DATA_FABRIC_TENANT_FOLDER_ID,
      },
    };
    const response = await this.post<string>(
      DATA_FABRIC_ENDPOINTS.CHOICESETS.CREATE,
      payload,
      { headers: createHeaders({ [FOLDER_KEY]: opts.folderKey }) },
    );
    return response.data;
  }

  @track('Choicesets.UpdateById')
  async updateById(choiceSetId: string, options: ChoiceSetUpdateOptions): Promise<void> {
    if (options.displayName === undefined && options.description === undefined) {
      throw new ValidationError({
        message: 'updateById requires at least one of displayName or description.',
      });
    }
    await this.patch(
      DATA_FABRIC_ENDPOINTS.CHOICESETS.UPDATE(choiceSetId),
      {
        ...(options.displayName !== undefined && { displayName: options.displayName }),
        ...(options.description !== undefined && { description: options.description }),
      },
      { headers: createHeaders({ [FOLDER_KEY]: options.folderKey }) },
    );
  }

  @track('Choicesets.DeleteById')
  async deleteById(choiceSetId: string, options?: ChoiceSetDeleteByIdOptions): Promise<void> {
    await this.post(
      DATA_FABRIC_ENDPOINTS.CHOICESETS.DELETE(choiceSetId),
      {},
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) },
    );
  }

  @track('Choicesets.InsertValueById')
  async insertValueById(
    choiceSetId: string,
    name: string,
    options?: ChoiceSetValueInsertOptions,
  ): Promise<ChoiceSetValueInsertResponse> {
    const choiceSetName = await this.resolveChoiceSetName(choiceSetId, options?.folderKey);
    const payload = {
      Name: name,
      ...(options?.displayName !== undefined && { DisplayName: options.displayName }),
    };
    const response = await this.post<RawChoiceSetGetResponse>(
      DATA_FABRIC_ENDPOINTS.CHOICESETS.INSERT_BY_NAME(choiceSetName),
      payload,
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) },
    );
    const camelCased = pascalToCamelCaseKeys(response.data);
    return transformData(camelCased, EntityMap) as ChoiceSetValueInsertResponse;
  }

  @track('Choicesets.UpdateValueById')
  async updateValueById(
    choiceSetId: string,
    valueId: string,
    displayName: string,
    options?: ChoiceSetValueUpdateOptions,
  ): Promise<ChoiceSetValueUpdateResponse> {
    const choiceSetName = await this.resolveChoiceSetName(choiceSetId, options?.folderKey);
    const payload = { DisplayName: displayName };
    const response = await this.post<RawChoiceSetGetResponse>(
      DATA_FABRIC_ENDPOINTS.CHOICESETS.UPDATE_BY_NAME(choiceSetName, valueId),
      payload,
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) },
    );
    const camelCased = pascalToCamelCaseKeys(response.data);
    return transformData(camelCased, EntityMap) as ChoiceSetValueUpdateResponse;
  }

  @track('Choicesets.DeleteValuesById')
  async deleteValuesById(choiceSetId: string, valueIds: string[], options?: ChoiceSetValueDeleteOptions): Promise<void> {
    await this.post(
      DATA_FABRIC_ENDPOINTS.CHOICESETS.DELETE_BY_ID(choiceSetId),
      valueIds,
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) },
    );
  }

  private async resolveChoiceSetName(choiceSetId: string, folderKey?: string): Promise<string> {
    // Use the un-tracked helper directly so we don't fire a duplicate
    // `Choicesets.GetAll` telemetry event for every insertValueById /
    // updateValueById call.
    const all = await this.fetchAllChoiceSets(folderKey === undefined ? undefined : { folderKey });
    const match = all.find(cs => cs.id === choiceSetId);
    if (!match) {
      throw new NotFoundError({ message: `Choice set with id '${choiceSetId}' not found.` });
    }
    return match.name;
  }
}

