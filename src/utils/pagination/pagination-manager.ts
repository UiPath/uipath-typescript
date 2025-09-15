import { PaginatedResponse, PaginationCursor } from './types';
import { CursorData, PaginationType, PaginationInfo } from './internal-types';
import { filterUndefined } from '../object';
import { encodeBase64 } from '../encoding/base64';

/**
 * PaginationManager handles the conversion between uniform cursor-based pagination
 * and the specific pagination type for each service
 */
export class PaginationManager {
  /**
   * Create a pagination cursor for subsequent page requests
   */
  static createCursor(
    { pageInfo, type }: PaginationInfo
  ): PaginationCursor | undefined {
    if (!pageInfo.hasMore) {
      return undefined;
    }
    
    const cursorData: CursorData = {
      type,
      pageSize: pageInfo.pageSize,
    };
    
    switch (type) {
      case PaginationType.OFFSET:
        if (pageInfo.currentPage) {
          cursorData.pageNumber = pageInfo.currentPage + 1;
        }
        break;
      
      case PaginationType.TOKEN:
        if (pageInfo.continuationToken) {
          cursorData.continuationToken = pageInfo.continuationToken;
        } else {
          return undefined; // No continuation token, can't continue
        }
        break;
    }
    
    return {
      value: encodeBase64(JSON.stringify(cursorData))
    };
  }

  /**
   * Create a paginated response with navigation cursors
   */
  static createPaginatedResponse<T>(
    { pageInfo, type }: PaginationInfo,
    items: T[],
  ): PaginatedResponse<T> {
    const nextCursor = PaginationManager.createCursor(
      { pageInfo, type });
    
    // Create previous page cursor if applicable
    let previousCursor: PaginationCursor | undefined = undefined;
    if (pageInfo.currentPage && pageInfo.currentPage > 1) {
      const prevCursorData: CursorData = {
        type,
        pageNumber: pageInfo.currentPage - 1,
        pageSize: pageInfo.pageSize,
      };
      
      previousCursor = {
        value: encodeBase64(JSON.stringify(prevCursorData))
      };
    }
    
    // Calculate total pages if we have totalCount and pageSize
    let totalPages: number | undefined = undefined;
    if (pageInfo.totalCount !== undefined && pageInfo.pageSize) {
      totalPages = Math.ceil(pageInfo.totalCount / pageInfo.pageSize);
    }
    
    // Determine if this pagination type supports page jumping
    const supportsPageJump = type === PaginationType.OFFSET;
    
    // Create the result object with all fields, then filter out undefined values
    const result = filterUndefined({
      items,
      totalCount: pageInfo.totalCount,
      hasNextPage: pageInfo.hasMore,
      nextCursor: nextCursor,
      previousCursor: previousCursor,
      currentPage: pageInfo.currentPage,
      totalPages,
      supportsPageJump
    });
    
    return result as PaginatedResponse<T>;
  }
} 