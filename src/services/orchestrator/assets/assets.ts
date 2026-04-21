import { FolderScopedService } from '../../folder-scoped';
import { AssetGetResponse, AssetGetAllOptions, AssetGetByIdOptions, AssetGetByNameOptions } from '../../../models/orchestrator/assets.types';
import { AssetServiceModel } from '../../../models/orchestrator/assets.models';
import { addPrefixToKeys, pascalToCamelCaseKeys, transformData } from '../../../utils/transform';
import { createHeaders } from '../../../utils/http/headers';
import { FOLDER_ID, FOLDER_PATH_ENCODED, FOLDER_KEY } from '../../../utils/constants/headers';
import { ASSET_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PREFIX, ODATA_OFFSET_PARAMS } from '../../../utils/constants/common';
import { AssetMap } from '../../../models/orchestrator/assets.constants';
import { CollectionResponse } from '../../../models/common/types';
import { NotFoundError } from '../../../core/errors';
import { validateGetByNameArgs } from '../../../utils/validation/name-validator';
import { ODATA_PAGINATION } from '../../../utils/constants/common';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { track } from '../../../core/telemetry';

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
   * Retrieves a single asset by name, optionally scoped to a folder
   *
   * @param name - Asset name to search for
   * @param options - Optional folder scoping and query parameters
   * @returns Promise resolving to a single asset
   *
   * @example
   * ```typescript
   * import { Assets } from '@uipath/uipath-typescript/assets';
   *
   * const assets = new Assets(sdk);
   *
   * // Get asset by name with folder path
   * const asset = await assets.getByName('ApiKey', { folderPath: 'Shared/Finance' });
   *
   * // Get asset by name with folder key
   * const asset = await assets.getByName('ApiKey', { folderKey: 'folder-guid' });
   *
   * // Get asset by name (uses default folder context)
   * const asset = await assets.getByName('ApiKey');
   * ```
   */
  @track('Assets.GetByName')
  async getByName(name: string, options: AssetGetByNameOptions = {}): Promise<AssetGetResponse> {
    const { folderPath: rawFolderPath, folderKey: rawFolderKey, ...queryOptions } = options;
    const validated = validateGetByNameArgs('Asset', name, rawFolderPath, rawFolderKey);

    // Fall back to the SDK's init-time folderKey (e.g. populated from the
    // `uipath:folder-key` meta tag in coded-app deployments) when the
    // caller didn't supply any folder context.
    const effectiveFolderKey =
      validated.folderKey ?? (validated.folderPath ? undefined : this.config.folderKey);

    const headers = createHeaders({
      [FOLDER_PATH_ENCODED]: validated.folderPath ? encodeURIComponent(validated.folderPath) : undefined,
      [FOLDER_KEY]: effectiveFolderKey,
    });

    const keysToPrefix = Object.keys(queryOptions);
    const apiOptions = {
      ...addPrefixToKeys(queryOptions, ODATA_PREFIX, keysToPrefix),
      '$filter': `Name eq '${validated.name.replace(/'/g, "''")}'`,
      '$top': '1',
    };

    const response = await this.get<CollectionResponse<AssetGetResponse>>(
      ASSET_ENDPOINTS.GET_BY_FOLDER,
      {
        headers,
        params: apiOptions,
      }
    );

    const items = response.data?.value;
    if (!items?.length) {
      const folderHint =
        validated.folderPath ? ` in folder '${validated.folderPath}'`
        : effectiveFolderKey ? ` in folder (key: ${effectiveFolderKey})`
        : '';
      throw new NotFoundError({
        message: `Asset '${validated.name}' not found${folderHint}.`,
      });
    }

    return transformData(pascalToCamelCaseKeys(items[0]) as AssetGetResponse, AssetMap);
  }
}
