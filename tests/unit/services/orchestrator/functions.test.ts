// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  FunctionService,
  clearLicenseCache,
  licenseExpiryMs,
  MAX_CACHED_LICENSES,
} from '../../../../src/services/orchestrator/functions/functions';
import { ApiClient } from '../../../../src/core/http/api-client';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import {
  createMockRawFunctionTrigger,
  createMockRawStudioWebLicense,
  createMockTransformedFunctionCollection,
} from '../../../utils/mocks/functions';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { createMockError } from '../../../utils/mocks/core';
import { FunctionGetAllOptions, FunctionHttpMethod } from '../../../../src/models/orchestrator/functions.types';
import { FunctionGetResponse } from '../../../../src/models/orchestrator/functions.models';
import { PaginatedResponse } from '../../../../src/utils/pagination';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { FUNCTION_TEST_CONSTANTS, FUNCTION_LICENSE_TEST_CONSTANTS } from '../../../utils/constants/functions';
import { FUNCTION_ENDPOINTS, FOLDER_ENDPOINTS, STUDIO_WEB_LICENSE_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { FOLDER_ID, FOLDER_KEY, JOB_KEY } from '../../../../src/utils/constants/headers';
import { ValidationError, NotFoundError } from '../../../../src/core/errors';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

const mocks = vi.hoisted(() => {
  return import('../../../utils/mocks/core');
});

vi.mock('../../../../src/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

// ===== TEST SUITE =====
describe('FunctionService Unit Tests', () => {
  let functionService: FunctionService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });

    vi.mocked(PaginationHelpers.getAll).mockReset();

    // The license cache is process-wide by design, so it survives between tests
    // unless cleared — otherwise one case inherits another's licenses.
    clearLicenseCache();

    functionService = new FunctionService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
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

    it('should rewrite package field names to their API navigation paths in filters', async () => {
      const mockResponse = createMockTransformedFunctionCollection();

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      await functionService.getAll({
        folderId: TEST_CONSTANTS.FOLDER_ID,
        filter: `processName eq '${FUNCTION_TEST_CONSTANTS.PROCESS_NAME}'`,
        orderby: 'processSlug asc',
      });

      // processName / processSlug are flattened from the nested Release entity
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          filter: `Release/Name eq '${FUNCTION_TEST_CONSTANTS.PROCESS_NAME}'`,
          orderby: 'Release/Slug asc',
        })
      );
    });

    it('should rewrite processKey to the API field name in filters', async () => {
      const mockResponse = createMockTransformedFunctionCollection();

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      await functionService.getAll({
        folderId: TEST_CONSTANTS.FOLDER_ID,
        filter: `processKey eq '${FUNCTION_TEST_CONSTANTS.PROCESS_KEY}'`,
      });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          filter: `releaseKey eq '${FUNCTION_TEST_CONSTANTS.PROCESS_KEY}'`,
        })
      );
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
      expect(transformed.processKey).toBe(FUNCTION_TEST_CONSTANTS.PROCESS_KEY);
      expect(transformed.processName).toBe(FUNCTION_TEST_CONSTANTS.PROCESS_NAME);
      expect(transformed.processSlug).toBe(FUNCTION_TEST_CONSTANTS.PROCESS_SLUG);
      expect(transformed.method).toBe(FunctionHttpMethod.Post);
      expect(transformed.slug).toBe(FUNCTION_TEST_CONSTANTS.SLUG);

      // The API returns OrganizationUnitFullyQualifiedName as null on list
      // responses, so it is not surfaced at all.
      expect((transformed as any).folderName).toBeUndefined();

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
    // Warm the license cache with a throwaway invocation, so the mocks in each
    // test line up with the invocation legs alone. The license leg has its own
    // describe block below.
    beforeEach(async () => {
      mockApiClient.get.mockResolvedValue({ value: [createMockRawFunctionTrigger()] });
      mockApiClient.post.mockImplementation((endpoint: string) =>
        Promise.resolve(
          endpoint === STUDIO_WEB_LICENSE_ENDPOINTS.ACQUIRE
            ? createMockRawStudioWebLicense()
            : FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT
        )
      );
      await functionService.invoke({ name: FUNCTION_TEST_CONSTANTS.NAME }, FUNCTION_TEST_CONSTANTS.INVOKE_INPUT, {
        folderKey: FUNCTION_TEST_CONSTANTS.FOLDER_KEY,
      });
      mockApiClient.post.mockReset();
      mockApiClient.get.mockReset();
    });

    it('should look up the function, resolve the folder key, and post the input', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ value: [createMockRawFunctionTrigger()] })
        .mockResolvedValueOnce({ Key: FUNCTION_TEST_CONSTANTS.FOLDER_KEY });
      mockApiClient.post.mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);

      const result = await functionService.invoke(
        { name: FUNCTION_TEST_CONSTANTS.NAME },
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
      mockApiClient.post.mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);

      const result = await functionService.invoke(
        { name: FUNCTION_TEST_CONSTANTS.NAME },
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
      mockApiClient.post.mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);

      await functionService.invoke(
        { name: FUNCTION_TEST_CONSTANTS.NAME },
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
      mockApiClient.post.mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);

      await functionService.invoke(
        { name: FUNCTION_TEST_CONSTANTS.NAME },
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

      // No separate warm-up needed: the license cache is shared across service
      // instances, so the one warmed above already covers this service.
      mockApiClient.get.mockResolvedValueOnce({ value: [createMockRawFunctionTrigger()] });
      mockApiClient.post.mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);

      const result = await service.invoke(
        { name: FUNCTION_TEST_CONSTANTS.NAME },
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
      mockApiClient.post.mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);

      await functionService.invoke(
        { name: FUNCTION_TEST_CONSTANTS.NAME },
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
        .mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);

      const result = await functionService.invoke(
        { name: FUNCTION_TEST_CONSTANTS.NAME },
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
      // Name lookup misses, then the folder's function names are listed for the error.
      mockApiClient.get
        .mockResolvedValueOnce({ value: [] })
        .mockResolvedValueOnce({ value: [] });

      await expect(
        functionService.invoke(
          { name: FUNCTION_TEST_CONSTANTS.NAME },
          FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
          { folderId: TEST_CONSTANTS.FOLDER_ID }
        )
      ).rejects.toThrow(NotFoundError);

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should list the folder\'s function names when a name lookup misses', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ value: [] })
        .mockResolvedValueOnce({
          value: [{ Name: FUNCTION_TEST_CONSTANTS.NAME }, { Name: FUNCTION_TEST_CONSTANTS.OTHER_NAME }],
        });

      // A package name passed where a function name belongs — the common mistake.
      await expect(
        functionService.invoke(
          { name: FUNCTION_TEST_CONSTANTS.PROCESS_NAME },
          FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
          { folderId: TEST_CONSTANTS.FOLDER_ID }
        )
      ).rejects.toThrow(
        new RegExp(`Available functions: ${FUNCTION_TEST_CONSTANTS.NAME}, ${FUNCTION_TEST_CONSTANTS.OTHER_NAME}`)
      );
    });

    it('should say so when the folder exposes no functions at all', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ value: [] })
        .mockResolvedValueOnce({ value: [] });

      await expect(
        functionService.invoke(
          { name: FUNCTION_TEST_CONSTANTS.NAME },
          FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
          { folderId: TEST_CONSTANTS.FOLDER_ID }
        )
      ).rejects.toThrow(/exposes no functions/);
    });

    it('should keep the original error when the name listing itself fails', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ value: [] })
        .mockRejectedValueOnce(createMockError());

      await expect(
        functionService.invoke(
          { name: FUNCTION_TEST_CONSTANTS.NAME },
          FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
          { folderId: TEST_CONSTANTS.FOLDER_ID }
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when no folder context is available', async () => {
      await expect(
        functionService.invoke({ name: FUNCTION_TEST_CONSTANTS.NAME }, FUNCTION_TEST_CONSTANTS.INVOKE_INPUT)
      ).rejects.toThrow(ValidationError);

      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should propagate errors from the function invocation', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ value: [createMockRawFunctionTrigger()] })
        .mockResolvedValueOnce({ Key: FUNCTION_TEST_CONSTANTS.FOLDER_KEY });
      mockApiClient.post.mockRejectedValueOnce(createMockError());

      await expect(
        functionService.invoke(
          { name: FUNCTION_TEST_CONSTANTS.NAME },
          FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
          { folderId: TEST_CONSTANTS.FOLDER_ID }
        )
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('license acquisition', () => {
    /** Queues the GETs an invocation makes: the name lookup, then the folder key. */
    const mockInvocationLookups = () => {
      mockApiClient.get
        .mockResolvedValueOnce({ value: [createMockRawFunctionTrigger()] })
        .mockResolvedValueOnce({ Key: FUNCTION_TEST_CONSTANTS.FOLDER_KEY });
    };

    const licenseCalls = () =>
      mockApiClient.post.mock.calls.filter(
        ([endpoint]) => endpoint === STUDIO_WEB_LICENSE_ENDPOINTS.ACQUIRE
      );

    /** Invokes with the folder key, which needs no Folders({id}) lookup. */
    const invoke = (options: Record<string, unknown> = {}) =>
      functionService.invoke({ name: FUNCTION_TEST_CONSTANTS.NAME }, FUNCTION_TEST_CONSTANTS.INVOKE_INPUT, {
        folderKey: FUNCTION_TEST_CONSTANTS.FOLDER_KEY,
        ...options,
      });

    /** Whoever the current token belongs to; each caller gets its own cache entry. */
    let caller = '';

    const invokeAs = (identity: string) => {
      caller = identity;
      return invoke();
    };

    /**
     * Serves a token per caller so invocations do not share a cache entry.
     * `expiredFor` hands that one caller a license that is already expired.
     */
    const mockDistinctCallers = (expiredFor?: string) => {
      const staleSeconds = Math.floor(Date.now() / 1000) - 3600;
      mockApiClient.getValidToken.mockImplementation(() => Promise.resolve(caller));
      mockApiClient.get.mockResolvedValue({ value: [createMockRawFunctionTrigger()] });
      mockApiClient.post.mockImplementation((endpoint: string) =>
        Promise.resolve(
          endpoint === STUDIO_WEB_LICENSE_ENDPOINTS.ACQUIRE
            ? createMockRawStudioWebLicense({}, caller === expiredFor ? { exp: staleSeconds } : {})
            : FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT
        )
      );
    };

    /** Fills the cache to its cap, one entry per caller. */
    const fillCache = async () => {
      for (let i = 0; i < MAX_CACHED_LICENSES; i++) await invokeAs(`user-${i}`);
    };

    it('should acquire a license before invoking', async () => {
      mockApiClient.post
        .mockResolvedValueOnce(createMockRawStudioWebLicense())
        .mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
      mockInvocationLookups();

      const result = await functionService.invoke(
        { name: FUNCTION_TEST_CONSTANTS.NAME },
        FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      );

      // Bodyless, and not folder-scoped
      expect(mockApiClient.post).toHaveBeenNthCalledWith(
        1,
        STUDIO_WEB_LICENSE_ENDPOINTS.ACQUIRE,
        undefined,
        expect.any(Object)
      );
      expect(result).toEqual(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
    });

    it('should not send refreshLicense to the discovery lookup as a query param', async () => {
      mockApiClient.post
        .mockResolvedValueOnce(createMockRawStudioWebLicense())
        .mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
      mockApiClient.get.mockResolvedValue({ value: [createMockRawFunctionTrigger()] });

      await invoke({ refreshLicense: true });

      expect(mockApiClient.get).toHaveBeenNthCalledWith(
        1,
        FUNCTION_ENDPOINTS.GET_ALL,
        expect.objectContaining({
          params: expect.not.objectContaining({ refreshLicense: expect.anything() }),
        })
      );
    });

    it('should reuse a cached license across invocations', async () => {
      mockApiClient.post
        .mockResolvedValueOnce(createMockRawStudioWebLicense())
        .mockResolvedValue(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
      mockApiClient.get.mockResolvedValue({ value: [createMockRawFunctionTrigger()] });

      await invoke();
      await invoke();
      await invoke();

      expect(licenseCalls()).toHaveLength(1);
    });

    it('should force a fresh acquisition when refreshLicense is set', async () => {
      mockApiClient.post
        .mockResolvedValueOnce(createMockRawStudioWebLicense())
        .mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT)
        .mockResolvedValueOnce(createMockRawStudioWebLicense())
        .mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
      mockApiClient.get.mockResolvedValue({ value: [createMockRawFunctionTrigger()] });

      await invoke();
      await invoke({ refreshLicense: true });

      expect(licenseCalls()).toHaveLength(2);
    });

    it('should re-acquire once a cached license has expired', async () => {
      // A license that expired an hour ago must not be served from the cache
      const staleSeconds = Math.floor(Date.now() / 1000) - 3600;
      mockApiClient.post
        .mockResolvedValueOnce(createMockRawStudioWebLicense({}, { exp: staleSeconds }))
        .mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT)
        .mockResolvedValueOnce(createMockRawStudioWebLicense())
        .mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
      mockApiClient.get.mockResolvedValue({ value: [createMockRawFunctionTrigger()] });

      await invoke();
      await invoke();

      expect(licenseCalls()).toHaveLength(2);
    });

    it('should collapse concurrent invocations into a single acquisition', async () => {
      mockApiClient.post.mockImplementation((endpoint: string) =>
        Promise.resolve(
          endpoint === STUDIO_WEB_LICENSE_ENDPOINTS.ACQUIRE
            ? createMockRawStudioWebLicense()
            : FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT
        )
      );
      mockApiClient.get.mockResolvedValue({ value: [createMockRawFunctionTrigger()] });

      await Promise.all([invoke(), invoke(), invoke()]);

      expect(licenseCalls()).toHaveLength(1);
    });

    it('should not invoke when the license cannot be acquired', async () => {
      mockApiClient.post.mockRejectedValueOnce(
        createMockError(FUNCTION_LICENSE_TEST_CONSTANTS.ERROR_LICENSE_UNAVAILABLE)
      );
      mockApiClient.get.mockResolvedValue({ value: [createMockRawFunctionTrigger()] });

      await expect(invoke()).rejects.toThrow(FUNCTION_LICENSE_TEST_CONSTANTS.ERROR_LICENSE_UNAVAILABLE);

      // Only the acquisition was attempted — the invocation itself never went out
      expect(licenseCalls()).toHaveLength(1);
      expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    });

    it('should surface the licensing failure rather than a name lookup failure', async () => {
      // Acquiring provisions the robot the invocation runs on, so licensing is
      // the precondition and its error is the more useful one to report.
      mockApiClient.post.mockRejectedValueOnce(
        createMockError(FUNCTION_LICENSE_TEST_CONSTANTS.ERROR_LICENSE_UNAVAILABLE)
      );
      mockApiClient.get.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(invoke()).rejects.toThrow(FUNCTION_LICENSE_TEST_CONSTANTS.ERROR_LICENSE_UNAVAILABLE);
    });

    it('should not cache a failed acquisition', async () => {
      mockApiClient.post
        .mockRejectedValueOnce(createMockError(FUNCTION_LICENSE_TEST_CONSTANTS.ERROR_LICENSE_UNAVAILABLE))
        .mockResolvedValueOnce(createMockRawStudioWebLicense())
        .mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
      mockApiClient.get.mockResolvedValue({ value: [createMockRawFunctionTrigger()] });

      await expect(invoke()).rejects.toThrow(FUNCTION_LICENSE_TEST_CONSTANTS.ERROR_LICENSE_UNAVAILABLE);
      // The failure was not cached, so the next invocation acquired afresh
      await expect(invoke()).resolves.toEqual(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);

      expect(licenseCalls()).toHaveLength(2);
    });

    it('should share the cache across separately constructed services', async () => {
      // Consumers routinely build a service per request or per render. If the
      // cache were an instance field, each would start empty and the licensing
      // round trip would be paid every time — the case this cache exists for.
      mockApiClient.post.mockImplementation((endpoint: string) =>
        Promise.resolve(
          endpoint === STUDIO_WEB_LICENSE_ENDPOINTS.ACQUIRE
            ? createMockRawStudioWebLicense()
            : FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT
        )
      );
      mockApiClient.get.mockResolvedValue({ value: [createMockRawFunctionTrigger()] });
      const { instance } = createServiceTestDependencies();
      const scope = { folderKey: FUNCTION_TEST_CONSTANTS.FOLDER_KEY };
      const ref = { name: FUNCTION_TEST_CONSTANTS.NAME };

      await new FunctionService(instance).invoke(ref, FUNCTION_TEST_CONSTANTS.INVOKE_INPUT, scope);
      await new FunctionService(instance).invoke(ref, FUNCTION_TEST_CONSTANTS.INVOKE_INPUT, scope);

      expect(licenseCalls()).toHaveLength(1);
    });

    it('should not share a license between tenants', async () => {
      mockApiClient.post.mockImplementation((endpoint: string) =>
        Promise.resolve(
          endpoint === STUDIO_WEB_LICENSE_ENDPOINTS.ACQUIRE
            ? createMockRawStudioWebLicense()
            : FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT
        )
      );
      mockApiClient.get.mockResolvedValue({ value: [createMockRawFunctionTrigger()] });
      const scope = { folderKey: FUNCTION_TEST_CONSTANTS.FOLDER_KEY };
      const ref = { name: FUNCTION_TEST_CONSTANTS.NAME };

      const tenantA = createServiceTestDependencies({ tenantName: 'TenantA' });
      const tenantB = createServiceTestDependencies({ tenantName: 'TenantB' });
      await new FunctionService(tenantA.instance).invoke(ref, FUNCTION_TEST_CONSTANTS.INVOKE_INPUT, scope);
      await new FunctionService(tenantB.instance).invoke(ref, FUNCTION_TEST_CONSTANTS.INVOKE_INPUT, scope);

      // Same user, different tenant — the second must not reuse the first
      expect(licenseCalls()).toHaveLength(2);
    });

    it('should still invoke when the license token cannot be decoded', async () => {
      mockApiClient.post
        .mockResolvedValueOnce(createMockRawStudioWebLicense({ licenseToken: 'not-a-jwt' }))
        .mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
      mockApiClient.get.mockResolvedValue({ value: [createMockRawFunctionTrigger()] });

      const result = await invoke();

      expect(result).toEqual(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
    });

    it('should evict the oldest entry once the cache is full', async () => {
      mockDistinctCallers();
      await fillCache();
      const atCap = licenseCalls().length;

      // One caller past the cap: room is made by dropping the oldest entry
      await invokeAs(`user-${MAX_CACHED_LICENSES}`);
      expect(licenseCalls()).toHaveLength(atCap + 1);

      // The newest caller is still cached, so no further acquisition
      await invokeAs(`user-${MAX_CACHED_LICENSES}`);
      expect(licenseCalls()).toHaveLength(atCap + 1);

      // The oldest was evicted, so it has to acquire again
      await invokeAs('user-0');
      expect(licenseCalls()).toHaveLength(atCap + 2);
    });

    it('should drop expired entries before evicting by age', async () => {
      // Mid-cache, so evicting it cannot be confused with evicting the oldest
      const expiredFor = `user-${Math.floor(MAX_CACHED_LICENSES / 2)}`;
      mockDistinctCallers(expiredFor);
      await fillCache();
      const atCap = licenseCalls().length;

      await invokeAs(`user-${MAX_CACHED_LICENSES}`);

      // The expired entry made the room, so the oldest live one survived
      await invokeAs('user-0');
      expect(licenseCalls()).toHaveLength(atCap + 1);
    });

    it('should acquire a license without invoking a function', async () => {
      mockApiClient.post.mockResolvedValueOnce(createMockRawStudioWebLicense());

      const license = await functionService.acquireLicense();

      expect(license.isLicensed).toBe(true);
      expect(license.licenseTier).toBe(FUNCTION_LICENSE_TEST_CONSTANTS.LICENSE_TIER);
      expect(license.startedTime).toBe(FUNCTION_LICENSE_TEST_CONSTANTS.STARTED);
      // Only the acquisition — nothing was invoked
      expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    });

    it('should reuse the cached license when acquiring directly', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawStudioWebLicense());

      await functionService.acquireLicense();
      await functionService.acquireLicense();

      expect(licenseCalls()).toHaveLength(1);
    });

    it('should keep a refreshed license when an earlier acquisition then fails', async () => {
      let rejectFirst!: (error: Error) => void;
      let licenseAttempt = 0;
      mockApiClient.post.mockImplementation((endpoint: string) => {
        if (endpoint !== STUDIO_WEB_LICENSE_ENDPOINTS.ACQUIRE) {
          return Promise.resolve(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
        }
        licenseAttempt += 1;
        return licenseAttempt === 1
          ? new Promise((_resolve, reject) => { rejectFirst = reject; })
          : Promise.resolve(createMockRawStudioWebLicense());
      });
      mockApiClient.get.mockResolvedValue({ value: [createMockRawFunctionTrigger()] });

      const failing = invoke();
      await vi.waitFor(() => expect(licenseCalls()).toHaveLength(1));

      // A refresh replaces the pending entry before the first one settles
      await invoke({ refreshLicense: true });
      rejectFirst(createMockError(FUNCTION_LICENSE_TEST_CONSTANTS.ERROR_LICENSE_UNAVAILABLE));
      await expect(failing).rejects.toThrow(FUNCTION_LICENSE_TEST_CONSTANTS.ERROR_LICENSE_UNAVAILABLE);

      // The failure must not evict the newer license, so nothing re-acquires
      await invoke();
      expect(licenseCalls()).toHaveLength(2);
    });

    it('should acquire a fresh license when asked to refresh', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawStudioWebLicense());

      await functionService.acquireLicense();
      await functionService.acquireLicense({ refresh: true });

      expect(licenseCalls()).toHaveLength(2);
    });
  });

  describe('licenseExpiryMs', () => {
    it('should return undefined when the license carries no expiry', () => {
      expect(licenseExpiryMs()).toBeUndefined();
    });

    it('should return undefined when the expiry cannot be parsed', () => {
      expect(licenseExpiryMs('not-a-date')).toBeUndefined();
    });

    it('should renew slightly before the stated expiry', () => {
      const expiresTime = '2026-08-18T12:00:00.000Z';

      expect(licenseExpiryMs(expiresTime)).toBeLessThan(Date.parse(expiresTime));
    });
  });
});
