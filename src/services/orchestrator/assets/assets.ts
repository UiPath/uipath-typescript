import { FolderScopedService } from '../../folder-scoped';
import { AssetGetResponse, AssetGetAllOptions, AssetGetByIdOptions, AssetGetByKeyOptions, AssetGetByNameOptions, AssetNewValue, AssetRef, AssetUpdateValueByIdOptions, AssetUpdateValueOptions, AssetValueScope, AssetValueType } from '../../../models/orchestrator/assets.types';
import { AssetServiceModel } from '../../../models/orchestrator/assets.models';
import { resolveRefToId } from '../../../utils/validation/resolve-ref';
import { addPrefixToKeys, pascalToCamelCaseKeys, transformData, transformOptions } from '../../../utils/transform';
import { createHeaders } from '../../../utils/http/headers';
import { FOLDER_ID } from '../../../utils/constants/headers';
import { resolveFolderHeaders } from '../../../utils/folder/folder-headers';
import { ASSET_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PREFIX, ODATA_OFFSET_PARAMS } from '../../../utils/constants/common';
import { AssetMap } from '../../../models/orchestrator/assets.constants';
import { ODATA_PAGINATION } from '../../../utils/constants/common';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { track } from '../../../core/telemetry';
import { ValidationError } from '../../../core/errors';

/**
 * Service for interacting with UiPath Orchestrator Assets API
 */
export class AssetService extends FolderScopedService implements AssetServiceModel {
  @track('Assets.GetAll')
  async getAll<T extends AssetGetAllOptions = AssetGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<AssetGetResponse>
      : NonPaginatedResponse<AssetGetResponse>
  > {
    // Transformation function for assets
    const transformAssetResponse = (asset: any) =>
      transformData(pascalToCamelCaseKeys(asset) as AssetGetResponse, AssetMap);

    // Rewrite renamed SDK field names → API names inside OData strings
    // before delegating, mirroring the transformRequest pattern used for
    // request bodies.
    const apiOptions = options ? transformOptions(options, AssetMap) : options;

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: (folderId) => folderId ? ASSET_ENDPOINTS.GET_BY_FOLDER : ASSET_ENDPOINTS.GET_ALL,
      getByFolderEndpoint: ASSET_ENDPOINTS.GET_BY_FOLDER,
      transformFn: transformAssetResponse,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: ODATA_PAGINATION.ITEMS_FIELD,
        totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM,     
          offsetParam: ODATA_OFFSET_PARAMS.OFFSET_PARAM,           
          countParam: ODATA_OFFSET_PARAMS.COUNT_PARAM              
        }
      }
    }, apiOptions) as any;
  }

  @track('Assets.GetById')
  async getById(id: number, folderId: number, options: AssetGetByIdOptions = {}): Promise<AssetGetResponse> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });

    const apiFieldOptions = transformOptions(options, AssetMap);
    const apiOptions = addPrefixToKeys(apiFieldOptions, ODATA_PREFIX, Object.keys(apiFieldOptions));

    const response = await this.get<AssetGetResponse>(
      ASSET_ENDPOINTS.GET_BY_ID(id),
      { 
        headers,
        params: apiOptions
      }
    );

    const transformedAsset = transformData(pascalToCamelCaseKeys(response.data) as AssetGetResponse, AssetMap);

    return transformedAsset;
  }

  @track('Assets.GetByName')
  async getByName(name: string, options: AssetGetByNameOptions = {}): Promise<AssetGetResponse> {
    const { result } = await this.getByNameLookup<AssetGetResponse, AssetGetResponse>(
      'Asset',
      ASSET_ENDPOINTS.GET_BY_FOLDER,
      name,
      options,
      (raw) => transformData(pascalToCamelCaseKeys(raw), AssetMap),
      AssetMap,
    );
    return result;
  }

  @track('Assets.GetByKey')
  async getByKey(key: string, options: AssetGetByKeyOptions = {}): Promise<AssetGetResponse> {
    const { result } = await this.getByKeyLookup<Record<string, unknown>, AssetGetResponse>(
      'Asset',
      ASSET_ENDPOINTS.GET_BY_FOLDER,
      key,
      options,
      (raw) => transformData(pascalToCamelCaseKeys(raw), AssetMap),
      AssetMap,
    );
    return result;
  }

  @track('Assets.UpdateValue')
  async updateValue(assetRef: AssetRef, newValue: AssetNewValue, options?: AssetUpdateValueOptions): Promise<void> {
    if (newValue === null || newValue === undefined) {
      throw new ValidationError({ message: 'newValue is required for updateValue' });
    }

    // Name/key lookups already return the full asset — stash it here so `updateValueByResolvedId`
    // can skip the follow-up `getById` and go straight to the PUT.
    let preFetched: Pick<AssetGetResponse, 'name' | 'valueScope' | 'valueType' | 'description'> | undefined;

    const { id, effectiveFolder } = await resolveRefToId<number>(
      assetRef,
      {
        byName: async (name) => {
          const { result: asset, effectiveFolder: folder } = await this.getByNameLookup<Record<string, unknown>, AssetGetResponse>(
            'Asset',
            ASSET_ENDPOINTS.GET_BY_FOLDER,
            name,
            { folderId: options?.folderId, folderKey: options?.folderKey, folderPath: options?.folderPath },
            (raw) => transformData(pascalToCamelCaseKeys(raw), AssetMap),
            AssetMap,
            'Assets.updateValue',
          );
          preFetched = asset;
          return { id: asset.id, ...folder };
        },
        byKey: async (key) => {
          const { result: asset, effectiveFolder: folder } = await this.getByKeyLookup<Record<string, unknown>, AssetGetResponse>(
            'Asset',
            ASSET_ENDPOINTS.GET_BY_FOLDER,
            key,
            { folderId: options?.folderId, folderKey: options?.folderKey, folderPath: options?.folderPath },
            (raw) => transformData(pascalToCamelCaseKeys(raw), AssetMap),
            AssetMap,
            'Assets.updateValue',
          );
          preFetched = asset;
          return { id: asset.id, ...folder };
        },
      },
      'Assets.updateValue',
    );

    // `resolveRefToId` treats `id: 0` as a real value (generic over `TId`); assets have positive
    // numeric ids only, so reject `0`/negatives here rather than letting them hit the API.
    if (id <= 0) {
      throw new ValidationError({ message: 'Assets.updateValue: assetRef.id must be a positive number.' });
    }

    // Prefer the folder the lookup confirmed against — for {name} refs an override redirect may
    // have changed folderPath. Falls back to caller-supplied options only for the {id} branch,
    // which leaves effectiveFolder empty (no lookup ran).
    const headers = resolveFolderHeaders({
      folderId: effectiveFolder.folderId ?? options?.folderId,
      folderKey: effectiveFolder.folderKey ?? options?.folderKey,
      folderPath: effectiveFolder.folderPath ?? options?.folderPath,
      resourceType: 'Assets.updateValue',
      fallbackFolderKey: this.config.folderKey,
    });

    await this.updateValueByResolvedId(id, newValue, headers, preFetched);
  }

  @track('Assets.UpdateValueById')
  async updateValueById(id: number, newValue: AssetNewValue, options?: AssetUpdateValueByIdOptions): Promise<void> {
    if (!id) {
      throw new ValidationError({ message: 'id is required for updateValueById' });
    }
    if (newValue === null || newValue === undefined) {
      throw new ValidationError({ message: 'newValue is required for updateValueById' });
    }

    const headers = resolveFolderHeaders({
      folderId: options?.folderId,
      folderKey: options?.folderKey,
      folderPath: options?.folderPath,
      resourceType: 'Assets.updateValueById',
      fallbackFolderKey: this.config.folderKey,
    });

    await this.updateValueByResolvedId(id, newValue, headers);
  }

  /**
   * Reads the asset shape, then puts it back with only the value field changed. Split out so
   * both `updateValue` and the deprecated `updateValueById` share the same wire behaviour
   * without either firing the other's `@track` decorator.
   */
  private async updateValueByResolvedId(
    id: number,
    newValue: AssetNewValue,
    headers: Record<string, string>,
    preFetched?: Pick<AssetGetResponse, 'name' | 'valueScope' | 'valueType' | 'description'>,
  ): Promise<void> {
    // `updateValue`'s name/key branches already fetched the asset — reuse those fields and skip
    // the extra GET. `updateValueById` and `updateValue({id})` still need the fetch.
    const shape = preFetched ?? await this.fetchAssetShape(id, headers);

    const valueField = resolveValueField(id, shape.valueType, newValue);

    const body: Record<string, unknown> = {
      Id: id,
      Name: shape.name,
      ValueScope: shape.valueScope,
      ValueType: shape.valueType,
      Description: shape.description,
      [valueField]: newValue,
    };

    await this.put(
      ASSET_ENDPOINTS.GET_BY_ID(id),
      body,
      { headers },
    );
  }

  /**
   * Reads the asset fields that a value update needs to round-trip. Split out so the id-branch of
   * `updateValue` and the deprecated `updateValueById` share the fetch, while name/key branches
   * bypass it by supplying `preFetched` from the lookup response.
   */
  private async fetchAssetShape(
    id: number,
    headers: Record<string, string>,
  ): Promise<Pick<AssetGetResponse, 'name' | 'valueScope' | 'valueType' | 'description'>> {
    const response = await this.get<{
      Name: string;
      ValueScope: AssetValueScope;
      ValueType: AssetValueType;
      Description: string | null;
    }>(
      ASSET_ENDPOINTS.GET_BY_ID(id),
      { headers },
    );
    return {
      name: response.data.Name,
      valueScope: response.data.ValueScope,
      valueType: response.data.ValueType,
      description: response.data.Description,
    };
  }

}

/**
 * Maps the asset's `valueType` to the PUT body field carrying the new value, validating
 * that the new value's runtime type matches the asset type.
 */
function resolveValueField(
  id: number,
  valueType: AssetValueType,
  newValue: AssetNewValue,
): 'StringValue' | 'IntValue' | 'BoolValue' {
  switch (valueType) {
    case AssetValueType.Text:
      if (typeof newValue !== 'string') {
        throw new ValidationError({
          message: `Asset ${id} has valueType Text; newValue must be a string, got ${typeof newValue}`,
        });
      }
      return 'StringValue';
    case AssetValueType.Integer:
      if (typeof newValue !== 'number' || !Number.isInteger(newValue)) {
        throw new ValidationError({
          message: `Asset ${id} has valueType Integer; newValue must be an integer number, got ${typeof newValue}`,
        });
      }
      return 'IntValue';
    case AssetValueType.Bool:
      if (typeof newValue !== 'boolean') {
        throw new ValidationError({
          message: `Asset ${id} has valueType Bool; newValue must be a boolean, got ${typeof newValue}`,
        });
      }
      return 'BoolValue';
    default:
      throw new ValidationError({
        message: `Asset ${id} has valueType ${valueType}; only Text, Integer, and Bool are supported`,
      });
  }
}
