import { FolderScopedService } from '../../folder-scoped';
import { AssetGetResponse, AssetGetAllOptions, AssetGetByIdOptions, AssetGetByKeyOptions, AssetGetByNameOptions, AssetNewValue, AssetRef, AssetUpdateValueByIdOptions, AssetUpdateValueOptions, AssetValueScope, AssetValueType } from '../../../models/orchestrator/assets.types';
import { AssetServiceModel } from '../../../models/orchestrator/assets.models';
import { resolveRefToId } from '../../../utils/refs/resolve-ref';
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
import { CollectionResponse } from '../../../models/common/types';
import { NotFoundError, ValidationError } from '../../../core/errors';

/**
 * Matches a canonical GUID; used to reject non-GUID keys on `getByKey` before hitting the API.
 */
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Matches single-quote characters in OData string literals — escaped to `''` in `$filter`. */
const SINGLE_QUOTE_RE = /'/g;

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
    return this.getByNameLookup<AssetGetResponse, AssetGetResponse>(
      'Asset',
      ASSET_ENDPOINTS.GET_BY_FOLDER,
      name,
      options,
      (raw) => transformData(pascalToCamelCaseKeys(raw), AssetMap),
      AssetMap,
    );
  }

  @track('Assets.GetByKey')
  async getByKey(key: string, options: AssetGetByKeyOptions = {}): Promise<AssetGetResponse> {
    return this.findAssetByKey(key, options, 'Assets.getByKey');
  }

  @track('Assets.UpdateValue')
  async updateValue(ref: AssetRef, newValue: AssetNewValue, options?: AssetUpdateValueOptions): Promise<void> {
    if (newValue === null || newValue === undefined) {
      throw new ValidationError({ message: 'newValue is required for updateValue' });
    }

    // Resolve the ref via the shared framework helper. Name-lookup goes through the protected
    // `getByNameLookup` (which applies runtime resource overrides); key-lookup goes through the
    // private `findAssetByKey` helper. Both return `{ id }` — Assets' OData response does not
    // carry the folder id, so `effectiveFolder.folderId` stays undefined and the update falls
    // back to the caller's folder options.
    const { id } = await resolveRefToId<number>(
      ref,
      {
        byName: async (name) => {
          const asset = await this.getByNameLookup<AssetGetResponse, AssetGetResponse>(
            'Asset',
            ASSET_ENDPOINTS.GET_BY_FOLDER,
            name,
            options ?? {},
            (raw) => transformData(pascalToCamelCaseKeys(raw), AssetMap),
            AssetMap,
          );
          return { id: asset.id };
        },
        byKey: async (key) => {
          const asset = await this.findAssetByKey(key, options ?? {}, 'Assets.updateValue');
          return { id: asset.id };
        },
      },
      'Assets.updateValue',
    );

    // Assets' name/key lookups do not return the folder id, so the caller's folder options
    // remain authoritative for the update. Runtime override redirects that cross folders are
    // confirmed by the successful lookup itself.
    const headers = resolveFolderHeaders({
      folderId: options?.folderId,
      folderKey: options?.folderKey,
      folderPath: options?.folderPath,
      resourceType: 'Assets.updateValue',
      fallbackFolderKey: this.config.folderKey,
    });

    await this.updateValueByResolvedId(id, newValue, headers);
  }

  /**
   * @deprecated Use {@link AssetService.updateValue} with `{ id }` or `{ name }` instead. This
   * method will be removed in the next major version.
   */
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
  ): Promise<void> {
    const existingResponse = await this.get<{
      Name: string;
      ValueScope: AssetValueScope;
      ValueType: AssetValueType;
      Description: string | null;
    }>(
      ASSET_ENDPOINTS.GET_BY_ID(id),
      { headers },
    );
    const existing = existingResponse.data;

    const valueField = resolveValueField(id, existing.ValueType, newValue);

    const body: Record<string, unknown> = {
      Id: id,
      Name: existing.Name,
      ValueScope: existing.ValueScope,
      ValueType: existing.ValueType,
      Description: existing.Description,
      [valueField]: newValue,
    };

    await this.put(
      ASSET_ENDPOINTS.GET_BY_ID(id),
      body,
      { headers },
    );
  }

  /**
   * Looks up a single asset by its GUID key on the folder-scoped OData collection. Shared by
   * public `getByKey` and the byKey branch of `updateValue` — no `@track` here so calling from
   * within another `@track`-decorated method does not double-fire telemetry.
   */
  private async findAssetByKey(
    key: string,
    options: AssetGetByKeyOptions,
    callerLabel: string,
  ): Promise<AssetGetResponse> {
    const trimmedKey = key?.trim();
    if (!trimmedKey || !GUID_REGEX.test(trimmedKey)) {
      throw new ValidationError({ message: `${callerLabel}: key must be a GUID.` });
    }

    const { folderId, folderKey, folderPath, ...queryOptions } = options;
    const headers = resolveFolderHeaders({
      folderId,
      folderKey,
      folderPath,
      resourceType: callerLabel,
      fallbackFolderKey: this.config.folderKey,
    });

    const apiFieldOptions = transformOptions(queryOptions, AssetMap);
    const apiOptions = {
      ...addPrefixToKeys(apiFieldOptions, ODATA_PREFIX, Object.keys(apiFieldOptions)),
      '$filter': `Key eq ${trimmedKey.replace(SINGLE_QUOTE_RE, "''")}`,
      '$top': '1',
    };

    const response = await this.get<CollectionResponse<AssetGetResponse>>(
      ASSET_ENDPOINTS.GET_BY_FOLDER,
      { headers, params: apiOptions },
    );

    const items = response.data?.value;
    if (!items?.length) {
      throw new NotFoundError({ message: `Asset with key '${trimmedKey}' not found.` });
    }

    return transformData(pascalToCamelCaseKeys(items[0]), AssetMap);
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
        message: `updateValueById only supports Text, Integer, or Bool assets; asset ${id} has valueType ${valueType}`,
      });
  }
}
