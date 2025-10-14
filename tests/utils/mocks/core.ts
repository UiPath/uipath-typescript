/**
 * Core mock utilities - Generic mocks used across all services
 */
import { vi } from 'vitest';
import { TEST_CONSTANTS } from '../constants/common';

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
 * Pagination helpers mock - Used across all services that need pagination
 * This provides a consistent mock for PaginationHelpers across all test files
 * 
 * Usage in test files:
 * ```typescript
 * // Use vi.hoisted to ensure mockPaginationHelpers is available during hoisting
 * const mocks = vi.hoisted(() => {
 *   return import('../../../utils/mocks/core');
 * });
 * 
 * vi.mock('../../../../src/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);
 * ```
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
