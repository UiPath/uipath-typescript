// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FunctionService } from '../../../../src/services/orchestrator/functions';
import { ApiClient } from '../../../../src/core/http/api-client';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import {
  createMockRawFunctionTrigger,
  createMockTransformedFunctionCollection,
} from '../../../utils/mocks/functions';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { createMockError } from '../../../utils/mocks/core';
import { FunctionGetAllOptions, FunctionHttpMethod } from '../../../../src/models/orchestrator/functions.types';
import { FunctionGetResponse } from '../../../../src/models/orchestrator/functions.models';
import { PaginatedResponse } from '../../../../src/utils/pagination';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { FUNCTION_TEST_CONSTANTS } from '../../../utils/constants/functions';
import { FUNCTION_ENDPOINTS, FOLDER_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { FOLDER_ID, FOLDER_KEY, JOB_KEY } from '../../../../src/utils/constants/headers';
import { ValidationError, NotFoundError, ServerError } from '../../../../src/core/errors';

// The invoke leg requests a raw Response (redirect: 'manual'); these helpers build
// the terminal 200 and the gateway's 303 "still running" legs.
const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const redirectResponse = (statusUrl: string) =>
  new Response(null, { status: 303, headers: { location: statusUrl } });

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

const mocks = vi.hoisted(() => {
  return import('../../../utils/mocks/core');
});

vi.mock('../../../../src/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

// ===== TEST SUITE =====
describe('FunctionService Unit Tests', () => {
  let functionService: FunctionService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });

    vi.mocked(PaginationHelpers.getAll).mockReset();

    functionService = new FunctionService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('getAll', () => {
    it('should return all functions in a folder', async () => {
      const mockResponse = createMockTransformedFunctionCollection();

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await functionService.getAll({ folderId: TEST_CONSTANTS.FOLDER_ID });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.toSatisfy((fn: Function) => fn() === FUNCTION_ENDPOINTS.GET_ALL),
          headers: expect.objectContaining({ [FOLDER_ID]: String(TEST_CONSTANTS.FOLDER_ID) }),
          transformFn: expect.any(Function),
          pagination: expect.any(Object),
        }),
        expect.not.objectContaining({ folderId: expect.anything() })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should resolve folder context from folderKey', async () => {
      const mockResponse = createMockTransformedFunctionCollection();

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      await functionService.getAll({ folderKey: FUNCTION_TEST_CONSTANTS.FOLDER_KEY });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ [FOLDER_KEY]: FUNCTION_TEST_CONSTANTS.FOLDER_KEY }),
        }),
        expect.any(Object)
      );
    });

    it('should throw ValidationError when no folder context is provided', async () => {
      await expect(functionService.getAll()).rejects.toThrow(ValidationError);
      expect(PaginationHelpers.getAll).not.toHaveBeenCalled();
    });

    it('should return paginated functions when pagination options provided', async () => {
      const mockResponse = createMockTransformedFunctionCollection(10, {
        totalCount: 100,
        hasNextPage: true,
        nextCursor: TEST_CONSTANTS.NEXT_CURSOR,
        previousCursor: null,
        currentPage: 1,
        totalPages: 10,
      });

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: FunctionGetAllOptions = {
        folderId: TEST_CONSTANTS.FOLDER_ID,
        pageSize: TEST_CONSTANTS.PAGE_SIZE,
      };

      const result = await functionService.getAll(options) as PaginatedResponse<FunctionGetResponse>;

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ pageSize: TEST_CONSTANTS.PAGE_SIZE })
      );

      expect(result).toEqual(mockResponse);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBe(TEST_CONSTANTS.NEXT_CURSOR);
    });

    it('should pass filter options through to the pagination helper', async () => {
      const mockResponse = createMockTransformedFunctionCollection();

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      await functionService.getAll({
        folderId: TEST_CONSTANTS.FOLDER_ID,
        filter: 'enabled eq true',
      });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ filter: 'enabled eq true' })
      );
    });

    it('should transform raw triggers to the function shape and drop internal fields', async () => {
      const mockResponse = createMockTransformedFunctionCollection();

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      await functionService.getAll({ folderId: TEST_CONSTANTS.FOLDER_ID });

      const { transformFn } = vi.mocked(PaginationHelpers.getAll).mock.calls[0][0];
      const transformed = transformFn!(createMockRawFunctionTrigger()) as FunctionGetResponse;

      // Renamed and reshaped fields carry the raw values
      expect(transformed.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect(transformed.folderName).toBe(FUNCTION_TEST_CONSTANTS.FOLDER_NAME);
      expect(transformed.processKey).toBe(FUNCTION_TEST_CONSTANTS.PROCESS_KEY);
      expect(transformed.processName).toBe(FUNCTION_TEST_CONSTANTS.PROCESS_NAME);
      expect(transformed.processSlug).toBe(FUNCTION_TEST_CONSTANTS.PROCESS_SLUG);
      expect(transformed.method).toBe(FunctionHttpMethod.Post);
      expect(transformed.slug).toBe(FUNCTION_TEST_CONSTANTS.SLUG);

      // Original PascalCase fields are absent
      expect((transformed as any).OrganizationUnitId).toBeUndefined();
      expect((transformed as any).ReleaseKey).toBeUndefined();
      expect((transformed as any).Release).toBeUndefined();

      // Dropped job-runner internals are absent in any casing
      expect((transformed as any).callingMode).toBeUndefined();
      expect((transformed as any).jobPriority).toBeUndefined();
      expect((transformed as any).runAsCaller).toBeUndefined();

      // Bound method is attached
      expect(typeof transformed.invoke).toBe('function');
    });

    it('should propagate errors from the pagination helper', async () => {
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(createMockError());

      await expect(
        functionService.getAll({ folderId: TEST_CONSTANTS.FOLDER_ID })
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('invoke', () => {
    it('should look up the function, resolve the folder key, and post the input', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ value: [createMockRawFunctionTrigger()] })
        .mockResolvedValueOnce({ Key: FUNCTION_TEST_CONSTANTS.FOLDER_KEY });
      mockApiClient.post.mockResolvedValueOnce(jsonResponse(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT));

      const result = await functionService.invoke(
        FUNCTION_TEST_CONSTANTS.NAME,
        FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      );

      // Step 1: name lookup on the HttpTriggers endpoint, folder-scoped
      expect(mockApiClient.get).toHaveBeenNthCalledWith(
        1,
        FUNCTION_ENDPOINTS.GET_ALL,
        expect.objectContaining({
          headers: expect.objectContaining({ [FOLDER_ID]: String(TEST_CONSTANTS.FOLDER_ID) }),
          params: expect.objectContaining({
            '$filter': `Name eq '${FUNCTION_TEST_CONSTANTS.NAME}'`,
          }),
        })
      );

      // Step 2: folder key resolution
      expect(mockApiClient.get).toHaveBeenNthCalledWith(
        2,
        FOLDER_ENDPOINTS.GET_BY_ID(TEST_CONSTANTS.FOLDER_ID),
        expect.any(Object)
      );

      // Step 3: invoke through the function endpoint
      expect(mockApiClient.post).toHaveBeenCalledWith(
        FUNCTION_ENDPOINTS.INVOKE(
          FUNCTION_TEST_CONSTANTS.FOLDER_KEY,
          FUNCTION_TEST_CONSTANTS.PROCESS_SLUG,
          FUNCTION_TEST_CONSTANTS.SLUG
        ),
        FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
        expect.any(Object)
      );

      expect(result).toEqual(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
    });

    it('should skip the folder key lookup when folderKey is provided', async () => {
      mockApiClient.get.mockResolvedValueOnce({ value: [createMockRawFunctionTrigger()] });
      mockApiClient.post.mockResolvedValueOnce(jsonResponse(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT));

      const result = await functionService.invoke(
        FUNCTION_TEST_CONSTANTS.NAME,
        FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
        { folderKey: FUNCTION_TEST_CONSTANTS.FOLDER_KEY }
      );

      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        FUNCTION_ENDPOINTS.INVOKE(
          FUNCTION_TEST_CONSTANTS.FOLDER_KEY,
          FUNCTION_TEST_CONSTANTS.PROCESS_SLUG,
          FUNCTION_TEST_CONSTANTS.SLUG
        ),
        FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
        expect.any(Object)
      );
      expect(result).toEqual(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
    });

    it('should send the X-UIPATH-JobKey header on the invocation when jobKey is provided', async () => {
      mockApiClient.get.mockResolvedValueOnce({ value: [createMockRawFunctionTrigger()] });
      mockApiClient.post.mockResolvedValueOnce(jsonResponse(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT));

      await functionService.invoke(
        FUNCTION_TEST_CONSTANTS.NAME,
        FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
        { folderKey: FUNCTION_TEST_CONSTANTS.FOLDER_KEY, jobKey: FUNCTION_TEST_CONSTANTS.JOB_KEY }
      );

      // The header rides only the invocation — not the name lookup, in any form
      expect(mockApiClient.get).toHaveBeenCalledWith(
        FUNCTION_ENDPOINTS.GET_ALL,
        expect.objectContaining({
          headers: expect.not.objectContaining({ [JOB_KEY]: expect.anything() }),
          params: expect.not.objectContaining({ '$jobKey': expect.anything() }),
        })
      );
      expect(mockApiClient.post).toHaveBeenCalledWith(
        FUNCTION_ENDPOINTS.INVOKE(
          FUNCTION_TEST_CONSTANTS.FOLDER_KEY,
          FUNCTION_TEST_CONSTANTS.PROCESS_SLUG,
          FUNCTION_TEST_CONSTANTS.SLUG
        ),
        FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
        expect.objectContaining({
          headers: expect.objectContaining({ [JOB_KEY]: FUNCTION_TEST_CONSTANTS.JOB_KEY }),
        })
      );
    });

    it('should not send the X-UIPATH-JobKey header when jobKey is omitted', async () => {
      mockApiClient.get.mockResolvedValueOnce({ value: [createMockRawFunctionTrigger()] });
      mockApiClient.post.mockResolvedValueOnce(jsonResponse(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT));

      await functionService.invoke(
        FUNCTION_TEST_CONSTANTS.NAME,
        FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
        { folderKey: FUNCTION_TEST_CONSTANTS.FOLDER_KEY }
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
        expect.objectContaining({
          headers: expect.not.objectContaining({ [JOB_KEY]: expect.anything() }),
        })
      );
    });

    it('should fall back to the SDK folder context when no folder options are given', async () => {
      const { instance } = createServiceTestDependencies({ folderKey: FUNCTION_TEST_CONSTANTS.FOLDER_KEY });
      const service = new FunctionService(instance);

      mockApiClient.get.mockResolvedValueOnce({ value: [createMockRawFunctionTrigger()] });
      mockApiClient.post.mockResolvedValueOnce(jsonResponse(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT));

      const result = await service.invoke(
        FUNCTION_TEST_CONSTANTS.NAME,
        FUNCTION_TEST_CONSTANTS.INVOKE_INPUT
      );

      // Lookup is scoped by the fallback folder key header; no Folders(id) call is made
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        FUNCTION_ENDPOINTS.GET_ALL,
        expect.objectContaining({
          headers: expect.objectContaining({ [FOLDER_KEY]: FUNCTION_TEST_CONSTANTS.FOLDER_KEY }),
        })
      );
      expect(result).toEqual(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
    });

    it('should send an empty object body when input is omitted', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ value: [createMockRawFunctionTrigger()] })
        .mockResolvedValueOnce({ Key: FUNCTION_TEST_CONSTANTS.FOLDER_KEY });
      mockApiClient.post.mockResolvedValueOnce(jsonResponse(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT));

      await functionService.invoke(
        FUNCTION_TEST_CONSTANTS.NAME,
        undefined,
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        {},
        expect.any(Object)
      );
    });

    it('should invoke functions declared with the Get method via query parameters', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ value: [createMockRawFunctionTrigger({ Method: 'Get' })] })
        .mockResolvedValueOnce({ Key: FUNCTION_TEST_CONSTANTS.FOLDER_KEY })
        .mockResolvedValueOnce(jsonResponse(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT));

      const result = await functionService.invoke(
        FUNCTION_TEST_CONSTANTS.NAME,
        FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
        { folderId: TEST_CONSTANTS.FOLDER_ID, jobKey: FUNCTION_TEST_CONSTANTS.JOB_KEY }
      );

      expect(mockApiClient.post).not.toHaveBeenCalled();
      expect(mockApiClient.get).toHaveBeenNthCalledWith(
        3,
        FUNCTION_ENDPOINTS.INVOKE(
          FUNCTION_TEST_CONSTANTS.FOLDER_KEY,
          FUNCTION_TEST_CONSTANTS.PROCESS_SLUG,
          FUNCTION_TEST_CONSTANTS.SLUG
        ),
        expect.objectContaining({
          params: FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
          headers: expect.objectContaining({ [JOB_KEY]: FUNCTION_TEST_CONSTANTS.JOB_KEY }),
        })
      );
      expect(result).toEqual(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
    });

    it('should throw NotFoundError when the function does not exist in the folder', async () => {
      mockApiClient.get.mockResolvedValueOnce({ value: [] });

      await expect(
        functionService.invoke(
          FUNCTION_TEST_CONSTANTS.NAME,
          FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
          { folderId: TEST_CONSTANTS.FOLDER_ID }
        )
      ).rejects.toThrow(NotFoundError);

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when no folder context is available', async () => {
      await expect(
        functionService.invoke(FUNCTION_TEST_CONSTANTS.NAME, FUNCTION_TEST_CONSTANTS.INVOKE_INPUT)
      ).rejects.toThrow(ValidationError);

      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should follow the 303 status long-poll chain until the output is ready', async () => {
      mockApiClient.get.mockResolvedValueOnce({ value: [createMockRawFunctionTrigger()] });
      // Invoke leg answers 303 (still running); status polls answer 303 then 200 + output.
      mockApiClient.post.mockResolvedValueOnce(redirectResponse(FUNCTION_TEST_CONSTANTS.STATUS_URL));
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(redirectResponse(FUNCTION_TEST_CONSTANTS.STATUS_URL))
        .mockResolvedValueOnce(jsonResponse(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT));
      vi.stubGlobal('fetch', mockFetch);

      const result = await functionService.invoke(
        FUNCTION_TEST_CONSTANTS.NAME,
        FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
        { folderKey: FUNCTION_TEST_CONSTANTS.FOLDER_KEY }
      );

      expect(result).toEqual(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      // Status polls carry the bearer token and never auto-follow redirects
      expect(mockFetch).toHaveBeenCalledWith(
        FUNCTION_TEST_CONSTANTS.STATUS_URL,
        expect.objectContaining({
          redirect: 'manual',
          headers: expect.objectContaining({
            Authorization: `Bearer ${TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN}`,
          }),
        })
      );
    });

    it('should throw ServerError when the function does not finish within maxWaitSeconds', async () => {
      mockApiClient.get.mockResolvedValueOnce({ value: [createMockRawFunctionTrigger()] });
      mockApiClient.post.mockResolvedValueOnce(redirectResponse(FUNCTION_TEST_CONSTANTS.STATUS_URL));
      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      await expect(
        functionService.invoke(
          FUNCTION_TEST_CONSTANTS.NAME,
          FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
          { folderKey: FUNCTION_TEST_CONSTANTS.FOLDER_KEY, maxWaitSeconds: 0 }
        )
      ).rejects.toThrow(ServerError);

      // Deadline already passed — no status poll is issued
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should propagate errors from the function invocation', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ value: [createMockRawFunctionTrigger()] })
        .mockResolvedValueOnce({ Key: FUNCTION_TEST_CONSTANTS.FOLDER_KEY });
      mockApiClient.post.mockRejectedValueOnce(createMockError());

      await expect(
        functionService.invoke(
          FUNCTION_TEST_CONSTANTS.NAME,
          FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
          { folderId: TEST_CONSTANTS.FOLDER_ID }
        )
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
