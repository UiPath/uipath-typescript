import { PageResult, PaginationCursor, PaginationOptions, InternalPaginationOptions, PaginationType } from './pagination.types';

/**
 * Internal cursor data structure for tracking pagination state
 */
interface CursorData {
  /** The type of pagination used by this service */
  type: PaginationType;
  
  /** For OData and Entity pagination */
  pageNumber?: number;
  
  /** For token-based pagination */
  continuationToken?: string;
  
  /** Common parameters */
  pageSize?: number;
  includeTotal?: boolean;
  
  /** Service-specific parameters (passed through) */
  extras?: Record<string, any>;
}

/**
 * PaginationManager handles the conversion between uniform cursor-based pagination
 * and the specific pagination type for each service
 */
export class PaginationManager {
  /**
   * Create a pagination cursor for subsequent page requests
   */
  static createCursor(
    pageInfo: {
      hasMore: boolean;
      pageSize?: number;
      currentPage?: number;
      continuationToken?: string;
      includeTotal?: boolean;
    }, 
    type: PaginationType,
    extras: Record<string, any> = {}
  ): PaginationCursor | undefined {
    if (!pageInfo.hasMore) {
      return undefined;
    }
    
    const cursorData: CursorData = {
      type,
      pageSize: pageInfo.pageSize,
      includeTotal: pageInfo.includeTotal,
      extras
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
      cursor: Buffer.from(JSON.stringify(cursorData)).toString('base64')
    };
  }
  
  /**
   * Convert a unified pagination options to service-specific parameters
   */
  static getRequestParameters(
    options: PaginationOptions
  ): InternalPaginationOptions {
    // If no cursor is provided, it's a first page request
    if (!options.cursor) {
      return {
        pageSize: options.pageSize,
        pageNumber: 1,
        includeTotal: options.includeTotal
      };
    }
    
    // Parse the cursor
    try {
      const cursorData: CursorData = JSON.parse(
        Buffer.from(options.cursor.cursor, 'base64').toString('utf-8')
      );
      
      return {
        pageSize: cursorData.pageSize || options.pageSize,
        pageNumber: cursorData.pageNumber,
        continuationToken: cursorData.continuationToken,
        includeTotal: options.includeTotal !== undefined ? options.includeTotal : cursorData.includeTotal,
        type: cursorData.type,
        extras: cursorData.extras
      };
    } catch (error) {
      throw new Error('Invalid pagination cursor');
    }
  }
  
  /**
   * Create a page result with navigation cursors
   */
  static createPageResult<T>(
    items: T[],
    pageInfo: {
      hasMore: boolean;
      totalCount?: number;
      currentPage?: number;
      pageSize?: number;
      continuationToken?: string;
      includeTotal?: boolean;
    },
    type: PaginationType,
    extras: Record<string, any> = {}
  ): PageResult<T> {
    const nextCursor = PaginationManager.createCursor(pageInfo, type, extras);
    
    // Create previous page cursor if applicable
    let previousCursor: PaginationCursor | undefined = undefined;
    if (pageInfo.currentPage && pageInfo.currentPage > 1) {
      const prevCursorData: CursorData = {
        type,
        pageNumber: pageInfo.currentPage - 1,
        pageSize: pageInfo.pageSize,
        extras
      };
      
      previousCursor = {
        cursor: Buffer.from(JSON.stringify(prevCursorData)).toString('base64')
      };
    }
    
    // Only include totalCount when includeTotal is true
    const shouldIncludeTotalCount = pageInfo.includeTotal === true;
    
    return {
      items,
      totalCount: shouldIncludeTotalCount ? pageInfo.totalCount : undefined,
      hasNext: pageInfo.hasMore,
      next: nextCursor,
      previous: previousCursor,
      hasTotalCount: shouldIncludeTotalCount && pageInfo.totalCount !== undefined
    };
  }
} 