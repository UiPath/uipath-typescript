import { BaseService } from './base';
import type { IUiPath } from '../core/types';
import { CollectionResponse } from '../models/common/types';
import { createHeaders } from '../utils/http/headers';
import { FOLDER_ID } from '../utils/constants/headers';
import { ODATA_PREFIX } from '../utils/constants/common';
import { addPrefixToKeys } from '../utils/transform';

/**
 * Base service for services that need folder-specific functionality.
 *
 * Extends BaseService with additional methods for working with folder-scoped resources
 * in UiPath Orchestrator. Services that work with folders (Assets, Queues) extend this class.
 *
 * @remarks
 * This class provides helper methods for making folder-scoped API calls, handling folder IDs
 * in request headers, and managing cross-folder queries.
 */
export class FolderScopedService extends BaseService {
  /**
   * Creates a folder-scoped service instance.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   */
  constructor(instance: IUiPath) {
    super(instance);
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