// ===== IMPORTS =====
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserService } from '../../../../src/services/orchestrator/users';
import { ApiClient } from '../../../../src/core/http/api-client';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import { createMockApiClient, createServiceTestDependencies } from '../../../utils/setup';
import { createMockError } from '../../../utils/mocks/core';
import { createMockRawUser, createMockTransformedUserCollection } from '../../../utils/mocks/users';
import { USER_TEST_CONSTANTS } from '../../../utils/constants/users';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { USERS_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { UserGetAllOptions, UserGetByIdOptions, UserGetCurrentOptions } from '../../../../src/models/orchestrator/users.types';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

const mocks = vi.hoisted(() => {
  return import('../../../utils/mocks/core');
});

vi.mock('../../../../src/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

// ===== TEST SUITE =====
describe('UserService Unit Tests', () => {
  let userService: UserService;
  let mockApiClient: any;

  const expectGetCalledWithODataParams = (
    endpoint: string,
    params: Record<string, unknown>
  ) => {
    expect(mockApiClient.get).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        params: expect.objectContaining(params)
      })
    );
  };

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);
    vi.mocked(PaginationHelpers.getAll).mockReset();

    userService = new UserService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getById', () => {
    it('should get user by ID successfully and map fields', async () => {
      const mockUser = createMockRawUser();
      mockApiClient.get.mockResolvedValue(mockUser);

      const result = await userService.getById(USER_TEST_CONSTANTS.USER_ID);

      expect(result).toBeDefined();
      expect(result.id).toBe(USER_TEST_CONSTANTS.USER_ID);
      expect(result.userName).toBe(USER_TEST_CONSTANTS.USERNAME);
      expect(result.emailAddress).toBe(USER_TEST_CONSTANTS.USER_EMAIL);
      expect(result.createdTime).toBe(USER_TEST_CONSTANTS.CREATED_TIME);
      expect((result as any).creationTime).toBeUndefined();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        USERS_ENDPOINTS.GET_BY_ID(USER_TEST_CONSTANTS.USER_ID),
        expect.any(Object)
      );
    });

    it('should get user with OData options', async () => {
      const mockUser = createMockRawUser();
      mockApiClient.get.mockResolvedValue(mockUser);

      const options: UserGetByIdOptions = {
        select: USER_TEST_CONSTANTS.ODATA_SELECT_FIELDS,
        expand: USER_TEST_CONSTANTS.ODATA_EXPAND_FIELDS
      };

      await userService.getById(USER_TEST_CONSTANTS.USER_ID, options);
      expectGetCalledWithODataParams(
        USERS_ENDPOINTS.GET_BY_ID(USER_TEST_CONSTANTS.USER_ID),
        {
          '$select': USER_TEST_CONSTANTS.ODATA_SELECT_FIELDS,
          '$expand': USER_TEST_CONSTANTS.ODATA_EXPAND_FIELDS
        }
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(USER_TEST_CONSTANTS.ERROR_USER_NOT_FOUND);
      mockApiClient.get.mockRejectedValue(error);

      await expect(userService.getById(USER_TEST_CONSTANTS.USER_ID))
        .rejects.toThrow(USER_TEST_CONSTANTS.ERROR_USER_NOT_FOUND);
    });
  });

  describe('getCurrent', () => {
    it('should return current user when API has data', async () => {
      const mockUser = createMockRawUser();
      mockApiClient.get.mockResolvedValue(mockUser);

      const options: UserGetCurrentOptions = {
        select: USER_TEST_CONSTANTS.ODATA_SELECT_FIELDS
      };

      const result = await userService.getCurrent(options);

      expect(result).toBeDefined();
      expect(result?.id).toBe(USER_TEST_CONSTANTS.USER_ID);
      expect(result?.userName).toBe(USER_TEST_CONSTANTS.USERNAME);
      expectGetCalledWithODataParams(USERS_ENDPOINTS.GET_CURRENT, {
        '$select': USER_TEST_CONSTANTS.ODATA_SELECT_FIELDS
      });
    });

    it('should return undefined when API returns no content', async () => {
      mockApiClient.get.mockResolvedValue(undefined);

      const result = await userService.getCurrent();

      expect(result).toBeUndefined();
      expect(mockApiClient.get).toHaveBeenCalledWith(
        USERS_ENDPOINTS.GET_CURRENT,
        expect.any(Object)
      );
    });
  });

  describe('getAll', () => {
    it('should return all users without pagination options', async () => {
      const mockResponse = createMockTransformedUserCollection();
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await userService.getAll();

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          getEndpoint: expect.toSatisfy((fn: Function) => fn() === USERS_ENDPOINTS.GET_ALL),
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        undefined
      );
      expect(result).toEqual(mockResponse);
    });

    it('should return paginated users when pagination options provided', async () => {
      const mockResponse = createMockTransformedUserCollection(100, {
        totalCount: 100,
        hasNextPage: true,
        nextCursor: TEST_CONSTANTS.NEXT_CURSOR,
        previousCursor: null,
        currentPage: 1,
        totalPages: 10
      });
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: UserGetAllOptions = {
        pageSize: TEST_CONSTANTS.PAGE_SIZE
      };

      const result = await userService.getAll(options) as any;

      expect(PaginationHelpers.getAll).toHaveBeenCalledTimes(1);
      const getAllCalls = vi.mocked(PaginationHelpers.getAll).mock.calls;
      const [paginationConfig, paginationOptions] = getAllCalls[0];
      expect(paginationConfig.getEndpoint()).toBe(USERS_ENDPOINTS.GET_ALL);
      expect(paginationOptions?.pageSize).toBe(TEST_CONSTANTS.PAGE_SIZE);
      expect(result).toEqual(mockResponse);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBe(TEST_CONSTANTS.NEXT_CURSOR);
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(userService.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
