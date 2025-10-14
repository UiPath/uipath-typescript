/**
 * Core mock utilities - Generic mocks used across all services
 */
import { vi } from 'vitest';
import { TEST_CONSTANTS } from '../constants/common';

/**
 * Ready-to-use mock for transform utilities
 * Import and spread this in your vi.mock() call
 * 
 * @example
 * vi.mock('../../../src/utils/transform', () => mockTransformUtils);
 */
export const mockTransformUtils = {
  pascalToCamelCaseKeys: vi.fn((obj) => obj),
  camelToPascalCaseKeys: vi.fn((obj) => obj),
  transformData: vi.fn((data) => data),
  applyDataTransforms: vi.fn((data) => data),
  addPrefixToKeys: vi.fn((obj) => obj),
};

/**
 * Ready-to-use mock for PaginationHelpers
 * Import and spread this in your vi.mock() call
 * 
 * @example
 * vi.mock('../../../src/utils/pagination/helpers', () => mockPaginationHelpers);
 */
export const mockPaginationHelpers = {
  PaginationHelpers: {
    getAll: vi.fn(),
    hasPaginationParameters: vi.fn((options = {}) => {
      const { cursor, pageSize, jumpToPage } = options;
      return cursor !== undefined || pageSize !== undefined || jumpToPage !== undefined;
    })
  }
};

/**
 * Generic factory for creating mock base response objects
 * Use this as a building block for service-specific responses
 * 
 * @param baseFields - Base fields common to most responses
 * @param overrides - Additional or override fields
 * @returns Mock response object
 * 
 * @example
 * ```typescript
 * const mockResponse = createMockBaseResponse(
 *   { id: 'test', name: 'Test' },
 * const mockTask = createMockBaseResponse(
 *   { id: 123, title: 'Test', folderId: 456 },
 *   { customField: 'value' }
 * );
 * ```
 */
export const createMockBaseResponse = <T extends Record<string, any>>(
  baseFields: T,
  overrides: Partial<T> = {}
): T => {
  return {
    ...baseFields,
    ...overrides,
  };
};

// Error mocks
export const createMockError = (message: string = TEST_CONSTANTS.ERROR_MESSAGE) => {
  const error = new Error(message) as any;
  error.status = 500;
  error.response = { status: 500, data: { message } };
  return error;
};

/**
 * Creates a mock operation response that matches the OperationResponse interface
 * Used for method responses that wrap API responses
 * @param data - The data to wrap in the operation response
 * @returns Mock operation response object with success and data fields
 * 
 * @example
 * ```typescript
 * // For single item response
 * const mockResponse = createMockOperationResponse({ id: '123', status: 'success' });
 * 
 * // For array response
 * const mockResponse = createMockOperationResponse([{ taskId: '123', userId: '456' }]);
 * ```
 */
export const createMockOperationResponse = <T>(data: T): { success: boolean; data: T } => ({
  success: true,
  data
});

/**
 * Generic factory for creating a collection of mock responses
 * Useful for testing list/getAll endpoints
 * 
 * @param count - Number of mock items to create
 * @param factory - Function that creates a single mock item given an index
 * @returns Array of mock items
 * 
 * @example
 * ```typescript
 * const mockTasks = createMockCollection(3, (i) => ({
 *   id: i + 1,
 *   title: `Task ${i + 1}`,
 *   status: 'Active'
 * }));
 * ```
 */
export const createMockCollection = <T>(
  count: number,
  factory: (index: number) => T
): T[] => {
  return Array.from({ length: count }, (_, i) => factory(i));
};
