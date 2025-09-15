import { BaseService } from './base';
import { Config } from '../core/config/config';
import { ExecutionContext } from '../core/context/execution';
import { TokenManager } from '../core/auth/token-manager';
import { CollectionResponse } from '../models/common/types';
import { createHeaders } from '../utils/http/headers';
import { FOLDER_ID } from '../utils/constants/headers';
import { ODATA_PREFIX } from '../utils/constants/common';
import { addPrefixToKeys } from '../utils/transform';

/**
 * Base service for services that need folder-specific functionality
 */
export class FolderScopedService extends BaseService {
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  /**
   * Gets resources in a folder with optional query parameters
   * 
   * @param endpoint - API endpoint to call
   * @param folderId - required folder ID
   * @param options - Query options
   * @param transformFn - Optional function to transform the response data
   * @returns Promise resolving to an array of resources
   */
  protected async _getByFolder<T, R = T>(
    endpoint: string, 
    folderId: number, 
    options: Record<string, any> = {},
    transformFn?: (item: T) => R
  ): Promise<R[]> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });

    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, keysToPrefix);
    
    const response = await this.get<CollectionResponse<T>>(
      endpoint,
      { 
        params: apiOptions,
        headers
      }
    );

    if (transformFn) {
      return response.data?.value.map(transformFn);
    }
    
    return response.data?.value as unknown as R[];
  }
} 