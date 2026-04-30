import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BaseService } from '../../../src/services/base';
import { ApiClient } from '../../../src/core/http/api-client';
import { PaginationType } from '../../../src/utils/pagination/internal-types';
import { PaginationOptions } from '../../../src/utils/pagination/types';
import type { RequestWithPaginationOptions } from '../../../src/utils/pagination/internal-types';
import type { RequestSpec } from '../../../src/models/common/request-spec';
import type { IUiPath } from '../../../src/core/types';
import { createServiceTestDependencies, createMockApiClient } from '../../utils/setup';
import { createMockError } from '../../utils/mocks/core';
import { TEST_CONSTANTS } from '../../utils/constants/common';
import {
  ODATA_OFFSET_PARAMS,
  BUCKET_TOKEN_PARAMS,
} from '../../../src/utils/constants/common';
import { DEFAULT_PAGE_SIZE } from '../../../src/utils/pagination/constants';

vi.mock('../../../src/core/http/api-client');

const TEST_PATH = '/test/path';
const TEST_BODY = { foo: 'bar' };
const TEST_RESPONSE = { id: 1, name: 'test' };

class TestableBaseService extends BaseService {
  public exposedGetValidAuthToken() {
    return this.getValidAuthToken();
  }

  public exposedCreatePaginationServiceAccess() {
    return this.createPaginationServiceAccess();
  }

  public exposedRequest<T>(method: string, path: string, options?: RequestSpec) {
    return this.request<T>(method, path, options);
  }

  public exposedRequestWithSpec<T>(spec: RequestSpec) {
    return this.requestWithSpec<T>(spec);
  }

  public exposedGet<T>(path: string, options?: RequestSpec) {
    return this.get<T>(path, options);
  }

  public exposedPost<T>(path: string, data?: unknown, options?: RequestSpec) {
    return this.post<T>(path, data, options);
  }

  public exposedPut<T>(path: string, data?: unknown, options?: RequestSpec) {
    return this.put<T>(path, data, options);
  }

  public exposedPatch<T>(path: string, data?: unknown, options?: RequestSpec) {
    return this.patch<T>(path, data, options);
  }

  public exposedDelete<T>(path: string, options?: RequestSpec) {
    return this.delete<T>(path, options);
  }

  public exposedRequestWithPagination<T>(
    method: string,
    path: string,
    paginationOptions: PaginationOptions,
    options: RequestWithPaginationOptions
  ) {
    return this.requestWithPagination<T>(method, path, paginationOptions, options);
  }
}

describe('BaseService Unit Tests', () => {
  let service: TestableBaseService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;
  let instance: IUiPath;

  beforeEach(() => {
    ({ instance } = createServiceTestDependencies());
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient as unknown as ApiClient);
    service = new TestableBaseService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should construct an ApiClient from registry internals with no extra headers', () => {
      expect(ApiClient).toHaveBeenCalledTimes(1);
      const [, , , clientConfig] = vi.mocked(ApiClient).mock.calls[0];
      expect(clientConfig).toEqual({});
    });

    it('should pass custom default headers through to the ApiClient', () => {
      vi.mocked(ApiClient).mockClear();
      const headers = { 'x-uipath-external-user-id': 'ext-user-123' };

      const scoped = new TestableBaseService(instance, headers);
      expect(scoped).toBeDefined();

      expect(ApiClient).toHaveBeenCalledTimes(1);
      const [, , , clientConfig] = vi.mocked(ApiClient).mock.calls[0];
      expect(clientConfig).toEqual({ headers });
    });

    it('should throw when constructed with an instance not registered in SDKInternalsRegistry', () => {
      const unknownInstance = {} as IUiPath;
      expect(() => new TestableBaseService(unknownInstance)).toThrow(
        /Invalid SDK instance/
      );
    });
  });

  describe('getValidAuthToken', () => {
    it('should delegate to the underlying ApiClient and return the token', async () => {
      const token = await service.exposedGetValidAuthToken();

      expect(mockApiClient.getValidToken).toHaveBeenCalledTimes(1);
      expect(token).toBe(TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN);
    });

    it('should propagate errors from the token manager', async () => {
      const error = createMockError('token refresh failed');
      mockApiClient.getValidToken.mockRejectedValueOnce(error);

      await expect(service.exposedGetValidAuthToken()).rejects.toThrow(
        'token refresh failed'
      );
    });
  });

  describe('HTTP method wrappers', () => {
    it('get should delegate to apiClient.get and wrap the response in ApiResponse', async () => {
      mockApiClient.get.mockResolvedValue(TEST_RESPONSE);

      const result = await service.exposedGet(TEST_PATH);

      expect(mockApiClient.get).toHaveBeenCalledWith(TEST_PATH, {});
      expect(result).toEqual({ data: TEST_RESPONSE });
    });

    it('get should pass through RequestSpec options unchanged', async () => {
      mockApiClient.get.mockResolvedValue(TEST_RESPONSE);
      const options: RequestSpec = { params: { q: '1' }, headers: { 'X-Custom': 'v' } };

      await service.exposedGet(TEST_PATH, options);

      expect(mockApiClient.get).toHaveBeenCalledWith(TEST_PATH, options);
    });

    it('post should delegate to apiClient.post with body and options', async () => {
      mockApiClient.post.mockResolvedValue(TEST_RESPONSE);

      const result = await service.exposedPost(TEST_PATH, TEST_BODY);

      expect(mockApiClient.post).toHaveBeenCalledWith(TEST_PATH, TEST_BODY, {});
      expect(result).toEqual({ data: TEST_RESPONSE });
    });

    it('put should delegate to apiClient.put with body and options', async () => {
      mockApiClient.put.mockResolvedValue(TEST_RESPONSE);

      const result = await service.exposedPut(TEST_PATH, TEST_BODY);

      expect(mockApiClient.put).toHaveBeenCalledWith(TEST_PATH, TEST_BODY, {});
      expect(result).toEqual({ data: TEST_RESPONSE });
    });

    it('patch should delegate to apiClient.patch with body and options', async () => {
      mockApiClient.patch.mockResolvedValue(TEST_RESPONSE);

      const result = await service.exposedPatch(TEST_PATH, TEST_BODY);

      expect(mockApiClient.patch).toHaveBeenCalledWith(TEST_PATH, TEST_BODY, {});
      expect(result).toEqual({ data: TEST_RESPONSE });
    });

    it('delete should delegate to apiClient.delete and wrap the response', async () => {
      mockApiClient.delete.mockResolvedValue(TEST_RESPONSE);

      const result = await service.exposedDelete(TEST_PATH);

      expect(mockApiClient.delete).toHaveBeenCalledWith(TEST_PATH, {});
      expect(result).toEqual({ data: TEST_RESPONSE });
    });

    it('should propagate errors from the underlying ApiClient', async () => {
      mockApiClient.get.mockRejectedValueOnce(createMockError('boom'));

      await expect(service.exposedGet(TEST_PATH)).rejects.toThrow('boom');
    });
  });

  describe('request', () => {
    beforeEach(() => {
      mockApiClient.get.mockResolvedValue(TEST_RESPONSE);
      mockApiClient.post.mockResolvedValue(TEST_RESPONSE);
      mockApiClient.put.mockResolvedValue(TEST_RESPONSE);
      mockApiClient.patch.mockResolvedValue(TEST_RESPONSE);
      mockApiClient.delete.mockResolvedValue(TEST_RESPONSE);
    });

    it('should route GET to apiClient.get', async () => {
      const result = await service.exposedRequest('GET', TEST_PATH);

      expect(mockApiClient.get).toHaveBeenCalledWith(TEST_PATH, {});
      expect(result).toEqual({ data: TEST_RESPONSE });
    });

    it('should be case-insensitive on the method name', async () => {
      await service.exposedRequest('get', TEST_PATH);
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    });

    it('should route POST to apiClient.post and pass body from options', async () => {
      await service.exposedRequest('POST', TEST_PATH, { body: TEST_BODY });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        TEST_PATH,
        TEST_BODY,
        expect.objectContaining({ body: TEST_BODY })
      );
    });

    it('should route PUT to apiClient.put and pass body from options', async () => {
      await service.exposedRequest('PUT', TEST_PATH, { body: TEST_BODY });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        TEST_PATH,
        TEST_BODY,
        expect.objectContaining({ body: TEST_BODY })
      );
    });

    it('should route PATCH to apiClient.patch and pass body from options', async () => {
      await service.exposedRequest('PATCH', TEST_PATH, { body: TEST_BODY });

      expect(mockApiClient.patch).toHaveBeenCalledWith(
        TEST_PATH,
        TEST_BODY,
        expect.objectContaining({ body: TEST_BODY })
      );
    });

    it('should route DELETE to apiClient.delete', async () => {
      await service.exposedRequest('DELETE', TEST_PATH);

      expect(mockApiClient.delete).toHaveBeenCalledWith(TEST_PATH, {});
    });

    it('should throw for unsupported HTTP methods', async () => {
      await expect(service.exposedRequest('HEAD', TEST_PATH)).rejects.toThrow(
        'Unsupported HTTP method: HEAD'
      );
    });
  });

  describe('requestWithSpec', () => {
    it('should throw when method is missing from the spec', async () => {
      await expect(
        service.exposedRequestWithSpec({ url: TEST_PATH })
      ).rejects.toThrow('Request spec must include method and url');
    });

    it('should throw when url is missing from the spec', async () => {
      await expect(
        service.exposedRequestWithSpec({ method: 'GET' })
      ).rejects.toThrow('Request spec must include method and url');
    });

    it('should delegate to request() when spec is valid', async () => {
      mockApiClient.get.mockResolvedValue(TEST_RESPONSE);

      const result = await service.exposedRequestWithSpec({
        method: 'GET',
        url: TEST_PATH,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        TEST_PATH,
        expect.objectContaining({ method: 'GET', url: TEST_PATH })
      );
      expect(result).toEqual({ data: TEST_RESPONSE });
    });
  });

  describe('createPaginationServiceAccess', () => {
    it('should return an object exposing get/post/requestWithPagination', () => {
      const access = service.exposedCreatePaginationServiceAccess();

      expect(typeof access.get).toBe('function');
      expect(typeof access.post).toBe('function');
      expect(typeof access.requestWithPagination).toBe('function');
    });

    it('access.get should delegate to the service get method', async () => {
      mockApiClient.get.mockResolvedValue(TEST_RESPONSE);
      const access = service.exposedCreatePaginationServiceAccess();

      const result = await access.get(TEST_PATH);

      expect(mockApiClient.get).toHaveBeenCalledWith(TEST_PATH, {});
      expect(result).toEqual({ data: TEST_RESPONSE });
    });

    it('access.post should delegate to the service post method', async () => {
      mockApiClient.post.mockResolvedValue(TEST_RESPONSE);
      const access = service.exposedCreatePaginationServiceAccess();

      const result = await access.post(TEST_PATH, TEST_BODY);

      expect(mockApiClient.post).toHaveBeenCalledWith(TEST_PATH, TEST_BODY, {});
      expect(result).toEqual({ data: TEST_RESPONSE });
    });
  });

  describe('requestWithPagination - OFFSET', () => {
    const offsetOptions: RequestWithPaginationOptions = {
      pagination: { paginationType: PaginationType.OFFSET },
    };

    it('should add $top/$count params and omit $skip on the first page', async () => {
      mockApiClient.get.mockResolvedValue({
        value: [TEST_RESPONSE],
        totalRecordCount: 1,
      });

      const result = await service.exposedRequestWithPagination(
        'GET',
        TEST_PATH,
        { pageSize: 25 },
        { ...offsetOptions }
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        TEST_PATH,
        expect.objectContaining({
          params: expect.objectContaining({
            [ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM]: 25,
            [ODATA_OFFSET_PARAMS.COUNT_PARAM]: true,
          }),
        })
      );
      const call = mockApiClient.get.mock.calls[0][1];
      expect(call.params).not.toHaveProperty(ODATA_OFFSET_PARAMS.OFFSET_PARAM);
      expect(result.items).toEqual([TEST_RESPONSE]);
      expect(result.totalCount).toBe(1);
      expect(result.hasNextPage).toBe(false);
      expect(result.currentPage).toBe(1);
      expect(result.supportsPageJump).toBe(true);
    });

    it('should compute $skip from jumpToPage and report hasNextPage when more pages exist', async () => {
      mockApiClient.get.mockResolvedValue({
        value: Array.from({ length: 10 }, () => TEST_RESPONSE),
        totalRecordCount: 100,
      });

      const result = await service.exposedRequestWithPagination(
        'GET',
        TEST_PATH,
        { pageSize: 10, jumpToPage: 3 },
        { ...offsetOptions }
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        TEST_PATH,
        expect.objectContaining({
          params: expect.objectContaining({
            [ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM]: 10,
            [ODATA_OFFSET_PARAMS.OFFSET_PARAM]: 20,
            [ODATA_OFFSET_PARAMS.COUNT_PARAM]: true,
          }),
        })
      );
      expect(result.currentPage).toBe(3);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor?.value).toBeTruthy();
      expect(result.previousCursor?.value).toBeTruthy();
    });

    it('should honour custom paginationParams overrides', async () => {
      mockApiClient.get.mockResolvedValue({ value: [], totalRecordCount: 0 });

      await service.exposedRequestWithPagination(
        'GET',
        TEST_PATH,
        { pageSize: 5, jumpToPage: 4 },
        {
          pagination: {
            paginationType: PaginationType.OFFSET,
            paginationParams: {
              pageSizeParam: 'limit',
              offsetParam: 'start',
              countParam: 'withCount',
            },
          },
        }
      );

      const params = mockApiClient.get.mock.calls[0][1].params as Record<string, unknown>;
      expect(params.limit).toBe(5);
      expect(params.start).toBe(15);
      expect(params.withCount).toBe(true);
      expect(params).not.toHaveProperty(ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM);
      expect(params).not.toHaveProperty(ODATA_OFFSET_PARAMS.OFFSET_PARAM);
      expect(params).not.toHaveProperty(ODATA_OFFSET_PARAMS.COUNT_PARAM);
    });

    it('should merge pagination params into the body for POST and clear query params', async () => {
      mockApiClient.post.mockResolvedValue({ value: [TEST_RESPONSE], totalRecordCount: 1 });

      await service.exposedRequestWithPagination(
        'POST',
        TEST_PATH,
        { pageSize: 10 },
        {
          ...offsetOptions,
          body: { filter: 'abc' },
          params: { extra: 'query' },
        }
      );

      const [calledPath, calledBody, calledOptions] = mockApiClient.post.mock.calls[0];
      expect(calledPath).toBe(TEST_PATH);
      expect(calledBody).toEqual({
        filter: 'abc',
        extra: 'query',
        [ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM]: 10,
        [ODATA_OFFSET_PARAMS.COUNT_PARAM]: true,
      });
      expect(calledOptions.params).toBeUndefined();
      expect(calledOptions.body).toEqual(calledBody);
    });

    it('should fall back to itemsCount heuristic for hasNextPage when totalCount is missing', async () => {
      mockApiClient.get.mockResolvedValue({
        value: Array.from({ length: DEFAULT_PAGE_SIZE }, () => TEST_RESPONSE),
      });

      const result = await service.exposedRequestWithPagination(
        'GET',
        TEST_PATH,
        {},
        { ...offsetOptions }
      );

      expect(result.totalCount).toBeUndefined();
      expect(result.hasNextPage).toBe(true);
    });
  });

  describe('requestWithPagination - TOKEN', () => {
    const tokenOptions: RequestWithPaginationOptions = {
      pagination: {
        paginationType: PaginationType.TOKEN,
        itemsField: 'items',
        continuationTokenField: 'continuationToken',
      },
    };

    it('should send takeHint when pageSize is provided and omit the token param on first page', async () => {
      mockApiClient.get.mockResolvedValue({ items: [TEST_RESPONSE] });

      const result = await service.exposedRequestWithPagination(
        'GET',
        TEST_PATH,
        { pageSize: 20 },
        { ...tokenOptions }
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        TEST_PATH,
        expect.objectContaining({
          params: expect.objectContaining({
            [BUCKET_TOKEN_PARAMS.PAGE_SIZE_PARAM]: 20,
          }),
        })
      );
      const params = mockApiClient.get.mock.calls[0][1].params as Record<string, unknown>;
      expect(params).not.toHaveProperty(BUCKET_TOKEN_PARAMS.TOKEN_PARAM);
      expect(result.items).toEqual([TEST_RESPONSE]);
      expect(result.hasNextPage).toBe(false);
      expect(result.supportsPageJump).toBe(false);
    });

    it('should report hasNextPage=true when the API returns a continuation token', async () => {
      mockApiClient.get.mockResolvedValue({
        items: [TEST_RESPONSE],
        continuationToken: 'next-token',
      });

      const result = await service.exposedRequestWithPagination(
        'GET',
        TEST_PATH,
        { pageSize: 20 },
        { ...tokenOptions }
      );

      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor?.value).toBeTruthy();
    });

    it('should reject jumpToPage for TOKEN pagination', async () => {
      await expect(
        service.exposedRequestWithPagination(
          'GET',
          TEST_PATH,
          { pageSize: 10, jumpToPage: 2 },
          { ...tokenOptions }
        )
      ).rejects.toThrow(/jumpToPage is not supported for token-based pagination/);
    });
  });

  describe('requestWithPagination - response extraction', () => {
    it('should default to an empty items array when the response is missing the items field', async () => {
      mockApiClient.get.mockResolvedValue({ '@odata.count': 0 });

      const result = await service.exposedRequestWithPagination(
        'GET',
        TEST_PATH,
        { pageSize: 10 },
        { pagination: { paginationType: PaginationType.OFFSET } }
      );

      expect(result.items).toEqual([]);
      expect(result.hasNextPage).toBe(false);
    });

    it('should respect custom field names when extracting items / totalCount', async () => {
      mockApiClient.get.mockResolvedValue({
        records: [TEST_RESPONSE, TEST_RESPONSE],
        count: 2,
      });

      const result = await service.exposedRequestWithPagination(
        'GET',
        TEST_PATH,
        { pageSize: 10 },
        {
          pagination: {
            paginationType: PaginationType.OFFSET,
            itemsField: 'records',
            totalCountField: 'count',
          },
        }
      );

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);
    });
  });
});
