import { FolderScopedService } from '../../folder-scoped';
import { AssetGetResponse, AssetGetAllOptions, AssetGetByIdOptions, AssetGetByNameOptions, AssetNewValue, AssetUpdateValueByIdOptions, AssetValueScope, AssetValueType } from '../../../models/orchestrator/assets.types';
import { AssetServiceModel } from '../../../models/orchestrator/assets.models';
import { addPrefixToKeys, pascalToCamelCaseKeys, transformData } from '../../../utils/transform';
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
  /**
   * Gets all assets across folders with optional filtering and folder scoping
   * 
   * @signature getAll(options?) -> Promise<AssetGetResponse[]>
   * @param options Query options including optional folderId and pagination options
   * @returns Promise resolving to array of assets or paginated response
   * 
   * @example
   * ```typescript
   * import { Assets } from '@uipath/uipath-typescript/assets';
   *
   * const assets = new Assets(sdk);
   *
   * // Standard array return
   * const allAssets = await assets.getAll();
   *
   * // With folder
   * const folderAssets = await assets.getAll({ folderId: 123 });
   *
   * // First page with pagination
   * const page1 = await assets.getAll({ pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await assets.getAll({ cursor: page1.nextCursor });
   * }
   *
   * // Jump to specific page
   * const page5 = await assets.getAll({
   *   jumpToPage: 5,
   *   pageSize: 10
   * });
   * ```
   */
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
    }, options) as any;
  }

  /**
   * Gets a single asset by ID
   * 
   * @param id - Asset ID
   * @param folderId - Required folder ID
   * @param options - Optional query parameters (expand, select)
   * @returns Promise resolving to a single asset
   * 
   * @example
   * ```typescript
   * import { Assets } from '@uipath/uipath-typescript/assets';
   *
   * const assets = new Assets(sdk);
   *
   * // Get asset by ID
   * const asset = await assets.getById(123, 456);
   * ```
   */
  @track('Assets.GetById')
  async getById(id: number, folderId: number, options: AssetGetByIdOptions = {}): Promise<AssetGetResponse> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, keysToPrefix);
    
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

  /**
   * Retrieves a single asset by name.
   *
   * @param name - Asset name to search for
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional query parameters (`expand`, `select`)
   * @returns Promise resolving to a single asset
   * {@link AssetGetResponse}
   * @example
   * ```typescript
   * import { Assets } from '@uipath/uipath-typescript/assets';
   *
   * const assets = new Assets(sdk);
   *
   * // By folder ID
   * await assets.getByName('ApiKey', { folderId: 123 });
   *
   * // By folder key (GUID)
   * await assets.getByName('ApiKey', { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });
   *
   * // By folder path
   * await assets.getByName('ApiKey', { folderPath: 'Shared/Finance' });
   *
   * // With expand
   * await assets.getByName('ApiKey', { folderPath: 'Shared/Finance', expand: 'keyValueList' });
   * ```
   */
  @track('Assets.GetByName')
  async getByName(name: string, options: AssetGetByNameOptions = {}): Promise<AssetGetResponse> {
    return this.getByNameLookup<AssetGetResponse, AssetGetResponse>(
      'Asset',
      ASSET_ENDPOINTS.GET_BY_FOLDER,
      name,
      options,
      (raw) => transformData(pascalToCamelCaseKeys(raw), AssetMap),
    );
  }

  /**
   * Updates the value of an existing asset by ID.
   *
   * Fetches the asset internally to determine its type, then updates only the value while
   * preserving the asset's name, scope, and description.
   *
   * **Supported value types:** `Text`, `Integer`, and `Bool` only. Other types
   * (`Credential`, `Secret`) throw a `ValidationError`.
   *
   * The `newValue` runtime type must match the asset's `valueType`:
   * - `Text` → `string`
   * - `Integer` → `number` (integer)
   * - `Bool` → `boolean`
   *
   * @param id - Asset ID
   * @param newValue - New value to apply (string for `Text`, number for `Integer`, boolean for `Bool`)
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`)
   * @returns Promise resolving when the asset has been updated
   *
   * @example
   * ```typescript
   * import { Assets } from '@uipath/uipath-typescript/assets';
   *
   * const assets = new Assets(sdk);
   *
   * // Update a Text asset by folder ID
   * await assets.updateValueById(<assetId>, 'new-value', { folderId: <folderId> });
   *
   * // Update an Integer asset by folder key (GUID)
   * await assets.updateValueById(<assetId>, 42, { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });
   *
   * // Update a Bool asset by folder path
   * await assets.updateValueById(<assetId>, true, { folderPath: 'Shared/Finance' });
   * ```
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
