import { PaginatedResponse, PaginationCursor } from './pagination.types';
import { CursorData, PaginationType, PaginationInfo } from './pagination.internal-types';
import { filterUndefined } from '../object-utils';

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
      case PaginationType.ODATA:
      case PaginationType.ENTITY:
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
      value: Buffer.from(JSON.stringify(cursorData)).toString('base64')
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
        value: Buffer.from(JSON.stringify(prevCursorData)).toString('base64')
      };
    }
    
    // Calculate total pages if we have totalCount and pageSize
    let totalPages: number | undefined = undefined;
    if (pageInfo.totalCount !== undefined && pageInfo.pageSize) {
      totalPages = Math.ceil(pageInfo.totalCount / pageInfo.pageSize);
    }
    
    // Determine if this pagination type supports page jumping
    const supportsPageJump = type === PaginationType.ODATA || type === PaginationType.ENTITY;
    
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