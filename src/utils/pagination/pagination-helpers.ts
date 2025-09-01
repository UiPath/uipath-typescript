import { PaginatedResponse, PaginationCursor, PaginationOptions } from './pagination.types';
import { 
  InternalPaginationOptions, 
  CursorData, 
  PaginationType, 
  GetAllPaginatedParams, 
  GetAllNonPaginatedParams,
} from './pagination.internal-types';
import { createHeaders } from '../http/headers';
import { FOLDER_ID } from '../constants/headers';
import { ODATA_PREFIX } from '../constants/common';
import { addPrefixToKeys } from '../transform';
import { NonPaginatedResponse } from '../../models/common/common-types';
import { DEFAULT_ITEMS_FIELD, DEFAULT_TOTAL_COUNT_FIELD } from './pagination.constants';
import { filterUndefined } from '../object-utils';

/**
 * Helper functions for pagination that can be used across services
 */
export class PaginationHelpers {
  /**
   * Checks if any pagination parameters are provided
   * 
   * @param options - The options object to check
   * @returns True if any pagination parameter is defined, false otherwise
   */
  static hasPaginationParameters(options: Record<string, any> = {}): boolean {
    const { cursor, pageSize, jumpToPage } = options;
    return cursor !== undefined || pageSize !== undefined || jumpToPage !== undefined;
  }

  /**
   * Parse a pagination cursor string into cursor data
   */
  static parseCursor(cursorString: string): CursorData {
    try {
      const cursorData: CursorData = JSON.parse(
        Buffer.from(cursorString, 'base64').toString('utf-8')
      );
      return cursorData;
    } catch (error) {
      throw new Error('Invalid pagination cursor');
    }
  }

  /**
   * Validates cursor format and structure
   * 
   * @param paginationOptions - The pagination options containing the cursor
   * @param paginationType - Optional pagination type to validate against
   */
  static validateCursor(
    paginationOptions: { cursor?: PaginationCursor }, 
    paginationType?: PaginationType
  ): void {
    if (paginationOptions.cursor !== undefined) {
      if (!paginationOptions.cursor || typeof paginationOptions.cursor.value !== 'string' || !paginationOptions.cursor.value) {
        throw new Error('cursor must contain a valid cursor string');
      }
      
      try {
        // Try to parse the cursor to validate it
        const cursorData = PaginationHelpers.parseCursor(paginationOptions.cursor.value);
        
        // If type is provided, validate cursor contains expected type information
        if (paginationType) {
          if (!cursorData.type) {
            throw new Error('Invalid cursor: missing pagination type');
          }
          
          // Check pagination type compatibility
          if (cursorData.type !== paginationType) {
            throw new Error(`Pagination type mismatch: cursor is for ${cursorData.type} but service uses ${paginationType}`);
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          // If it's already our error with specific message, pass it through
          if (error.message.startsWith('Invalid cursor') || 
              error.message.startsWith('Pagination type mismatch')) {
            throw error;
          }
        }
        throw new Error('Invalid pagination cursor format');
      }
    }
  }

  /**
   * Comprehensive validation for pagination options
   * 
   * @param options - The pagination options to validate
   * @param paginationType - The pagination type these options will be used with
   * @returns Processed pagination parameters ready for use
   */
  static validatePaginationOptions(
    options: PaginationOptions,
    paginationType: PaginationType
  ): InternalPaginationOptions {
    // Validate pageSize
    if (options.pageSize !== undefined && options.pageSize <= 0) {
      throw new Error('pageSize must be a positive number');
    }
    
    // Validate jumpToPage
    if (options.jumpToPage !== undefined && options.jumpToPage <= 0) {
      throw new Error('jumpToPage must be a positive number');
    }
    
    // Validate cursor
    PaginationHelpers.validateCursor(options, paginationType);
    
    // Validate service compatibility
    if (options.jumpToPage !== undefined && paginationType === PaginationType.TOKEN) {
      throw new Error('jumpToPage is not supported for token-based pagination. Use cursor-based navigation instead.');
    }
    
    // Get processed parameters
    return PaginationHelpers.getRequestParameters(options);
  }
  
  /**
   * Convert a unified pagination options to service-specific parameters
   */
  static getRequestParameters(
    options: PaginationOptions
  ): InternalPaginationOptions {
    // Handle jumpToPage
    if (options.jumpToPage !== undefined) {
      const jumpToPageOptions: InternalPaginationOptions = {
        pageSize: options.pageSize,
        pageNumber: options.jumpToPage
      };
      return filterUndefined(jumpToPageOptions);
    }
    
    // If no cursor is provided, it's a first page request
    if (!options.cursor) {
      const firstPageOptions: InternalPaginationOptions = {
        pageSize: options.pageSize,
        pageNumber: 1
      };
      return filterUndefined(firstPageOptions);
    }
    
    // Parse the cursor
    try {
      const cursorData = PaginationHelpers.parseCursor(options.cursor.value);
      
      const cursorBasedOptions: InternalPaginationOptions = {
        pageSize: cursorData.pageSize || options.pageSize,
        pageNumber: cursorData.pageNumber,
        continuationToken: cursorData.continuationToken,
        type: cursorData.type,
      };
      return filterUndefined(cursorBasedOptions);
    } catch (error) {
      throw new Error('Invalid pagination cursor');
    }
  }

  /**
   * Helper method for paginated resource retrieval
   * 
   * @param params - Parameters for pagination
   * @returns Promise resolving to a paginated result
   */
  static async getAllPaginated<T, R = T>(
    params: GetAllPaginatedParams<T, R>
  ): Promise<PaginatedResponse<R>> {
    const {
      serviceAccess,
      getEndpoint,
      folderId,
      paginationParams,
      additionalParams,
      transformFn,
      options = {}
    } = params;

    const endpoint = getEndpoint(folderId);
    const headers = folderId ? createHeaders({ [FOLDER_ID]: folderId }) : {};
    
    const paginatedResponse = await serviceAccess.requestWithPagination<T>(
      'GET',
      endpoint,
      paginationParams,
      {
        headers,
        params: additionalParams,
        pagination: {
          paginationType: options.paginationType || PaginationType.ODATA,
          itemsField: options.itemsField || DEFAULT_ITEMS_FIELD,
          totalCountField: options.totalCountField || DEFAULT_TOTAL_COUNT_FIELD
        }
      }
    );
    
    // Transform the data using the provided transform function
    const transformedItems = paginatedResponse.items.map(transformFn);
    
    return {
      ...paginatedResponse,
      items: transformedItems
    };
  }

  /**
   * Helper method for non-paginated resource retrieval
   * 
   * @param params - Parameters for non-paginated resource retrieval
   * @returns Promise resolving to an object with data and totalCount
   */
  static async getAllNonPaginated<T, R = T>(
    params: GetAllNonPaginatedParams<T, R>
  ): Promise<NonPaginatedResponse<R>> {
    const {
      serviceAccess,
      getAllEndpoint,
      getByFolderEndpoint,
      folderId,
      additionalParams,
      transformFn,
      options = {}
    } = params;

    // Set default field names
    const itemsField = options.itemsField || DEFAULT_ITEMS_FIELD;
    const totalCountField = options.totalCountField || DEFAULT_TOTAL_COUNT_FIELD;
    
    // Prepare common request options
    const keysToPrefix = Object.keys(additionalParams);
    const apiOptions = addPrefixToKeys(additionalParams, ODATA_PREFIX, keysToPrefix);
    
    // Determine endpoint and headers based on folderId
    const endpoint = folderId ? getByFolderEndpoint : getAllEndpoint;
    const headers = folderId ? createHeaders({ [FOLDER_ID]: folderId }) : {};
    
    // Make the API call
    const response = await serviceAccess.get<any>(
      endpoint,
      { 
        params: apiOptions,
        headers
      }
    );

    // Extract and transform data
    const items = response.data?.[itemsField] || [];
    const data = items.map(transformFn);
    const totalCount = response.data?.[totalCountField];
    
    return {
      items: data,
      totalCount
    };
  }
} 