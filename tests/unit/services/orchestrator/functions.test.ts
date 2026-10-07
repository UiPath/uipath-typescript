// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  FunctionService,
  buildInvokeRoute,
  parseExternalReference,
} from '../../../../src/services/orchestrator/functions/functions';
import { ApiClient } from '../../../../src/core/http/api-client';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import {
  createMockRawFunctionTrigger,
  createMockTransformedFunctionCollection,
} from '../../../utils/mocks/functions';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { createMockError } from '../../../utils/mocks/core';
import { FunctionGetAllOptions, FunctionHttpMethod, FunctionRef } from '../../../../src/models/orchestrator/functions.types';
import { FunctionGetResponse } from '../../../../src/models/orchestrator/functions.models';
import { PaginatedResponse } from '../../../../src/utils/pagination';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { FUNCTION_TEST_CONSTANTS } from '../../../utils/constants/functions';
import { FUNCTION_ENDPOINTS, FOLDER_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { FOLDER_ID, FOLDER_KEY, JOB_KEY } from '../../../../src/utils/constants/headers';
import { ValidationError, NotFoundError, ServerError } from '../../../../src/core/errors';

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

    functionService = new FunctionService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
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
    it('should look up the function and post the input to the route its trigger declares', async () => {
      mockApiClient.get.mockResolvedValueOnce({ value: [createMockRawFunctionTrigger()] });
      mockApiClient.post.mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);

      const result = await functionService.invoke(
        { name: FUNCTION_TEST_CONSTANTS.NAME },
        FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      );

      // Step 1: name lookup on the HttpTriggers endpoint, folder-scoped
      expect(mockApiClient.get).toHaveBeenCalledWith(
        FUNCTION_ENDPOINTS.GET_ALL,
        expect.objectContaining({
          headers: expect.objectContaining({ [FOLDER_ID]: String(TEST_CONSTANTS.FOLDER_ID) }),
          params: expect.objectContaining({
            '$filter': `Name eq '${FUNCTION_TEST_CONSTANTS.NAME}' or endswith(Name,'_${FUNCTION_TEST_CONSTANTS.NAME}')`,
          }),
        })
      );

      // The ExternalReference carries the folder key, so no Folders(id) call is made
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);

      // Step 2: invoke through the route and folder key the ExternalReference names
      expect(mockApiClient.post).toHaveBeenCalledWith(
        FUNCTION_ENDPOINTS.INVOKE(FUNCTION_TEST_CONSTANTS.FOLDER_KEY, FUNCTION_TEST_CONSTANTS.ROUTE),
        FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
        expect.any(Object)
      );

      expect(result).toEqual(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
    });

    it('should derive the route and look up the folder key when the trigger has no ExternalReference', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ value: [createMockRawFunctionTrigger({ ExternalReference: null })] })
        .mockResolvedValueOnce({ Key: FUNCTION_TEST_CONSTANTS.FOLDER_KEY });
      mockApiClient.post.mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);

      await functionService.invoke(
        { name: FUNCTION_TEST_CONSTANTS.NAME },
        FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      );

      expect(mockApiClient.get).toHaveBeenNthCalledWith(
        2,
        FOLDER_ENDPOINTS.GET_BY_ID(TEST_CONSTANTS.FOLDER_ID),
        expect.any(Object)
      );
      expect(mockApiClient.post).toHaveBeenCalledWith(
        FUNCTION_ENDPOINTS.INVOKE(FUNCTION_TEST_CONSTANTS.FOLDER_KEY, FUNCTION_TEST_CONSTANTS.ROUTE),
        FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
        expect.any(Object)
      );
    });

    it('should reject a route with path parameters without invoking', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        value: [createMockRawFunctionTrigger({ ExternalReference: FUNCTION_TEST_CONSTANTS.EXTERNAL_REFERENCE_PARAM })],
      });

      await expect(
        functionService.invoke(
          { name: FUNCTION_TEST_CONSTANTS.NAME },
          FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
          { folderId: TEST_CONSTANTS.FOLDER_ID }
        )
      ).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should reject a derived route with a wildcard without invoking', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        value: [createMockRawFunctionTrigger({ ExternalReference: null, Slug: FUNCTION_TEST_CONSTANTS.WILDCARD_SLUG })],
      });

      await expect(
        functionService.invoke(
          { name: FUNCTION_TEST_CONSTANTS.NAME },
          FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
          { folderKey: FUNCTION_TEST_CONSTANTS.FOLDER_KEY }
        )
      ).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.post).not.toHaveBeenCalled();
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
        FUNCTION_ENDPOINTS.INVOKE(FUNCTION_TEST_CONSTANTS.FOLDER_KEY, FUNCTION_TEST_CONSTANTS.ROUTE),
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
        FUNCTION_ENDPOINTS.INVOKE(FUNCTION_TEST_CONSTANTS.FOLDER_KEY, FUNCTION_TEST_CONSTANTS.ROUTE),
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
      mockApiClient.get.mockResolvedValueOnce({ value: [createMockRawFunctionTrigger()] });
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
        .mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);

      const result = await functionService.invoke(
        { name: FUNCTION_TEST_CONSTANTS.NAME },
        FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
        { folderId: TEST_CONSTANTS.FOLDER_ID, jobKey: FUNCTION_TEST_CONSTANTS.JOB_KEY }
      );

      expect(mockApiClient.post).not.toHaveBeenCalled();
      expect(mockApiClient.get).toHaveBeenNthCalledWith(
        2,
        FUNCTION_ENDPOINTS.INVOKE(FUNCTION_TEST_CONSTANTS.FOLDER_KEY, FUNCTION_TEST_CONSTANTS.ROUTE),
        expect.objectContaining({
          params: FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
          headers: expect.objectContaining({ [JOB_KEY]: FUNCTION_TEST_CONSTANTS.JOB_KEY }),
        })
      );
      expect(result).toEqual(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
    });

    describe('name resolution', () => {
      /** Serves the name lookup with `rows`, then answers the invocation. */
      const mockLookup = (...rows: Record<string, unknown>[]) => {
        mockApiClient.get.mockResolvedValueOnce({ value: rows });
        mockApiClient.post.mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
      };

      /** Invokes with the folder key, so the lookup is the only GET. */
      const invokeByRef = (func: FunctionRef) =>
        functionService.invoke(func, FUNCTION_TEST_CONSTANTS.INVOKE_INPUT, {
          folderKey: FUNCTION_TEST_CONSTANTS.FOLDER_KEY,
        });

      const lookupFilter = () => mockApiClient.get.mock.calls[0][1].params['$filter'];

      it('should resolve a process-prefixed trigger from the name declared in source', async () => {
        mockLookup(createMockRawFunctionTrigger({ Name: FUNCTION_TEST_CONSTANTS.PREFIXED_NAME }));

        const result = await invokeByRef({ name: FUNCTION_TEST_CONSTANTS.NAME });

        expect(mockApiClient.post).toHaveBeenCalledWith(
          FUNCTION_ENDPOINTS.INVOKE(FUNCTION_TEST_CONSTANTS.FOLDER_KEY, FUNCTION_TEST_CONSTANTS.ROUTE),
          FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
          expect.any(Object)
        );
        expect(result).toEqual(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
      });

      it('should resolve the full stored name as returned by getAll', async () => {
        mockLookup(createMockRawFunctionTrigger({ Name: FUNCTION_TEST_CONSTANTS.PREFIXED_NAME }));

        await invokeByRef({ name: FUNCTION_TEST_CONSTANTS.PREFIXED_NAME });

        expect(lookupFilter()).toBe(
          `Name eq '${FUNCTION_TEST_CONSTANTS.PREFIXED_NAME}' or endswith(Name,'_${FUNCTION_TEST_CONSTANTS.PREFIXED_NAME}')`
        );
        expect(mockApiClient.post).toHaveBeenCalledTimes(1);
      });

      it('should prefer an exact name match over a process-prefixed one', async () => {
        mockLookup(
          createMockRawFunctionTrigger({
            Name: FUNCTION_TEST_CONSTANTS.OTHER_PREFIXED_NAME,
            Slug: FUNCTION_TEST_CONSTANTS.OTHER_NAME,
            Release: { Name: FUNCTION_TEST_CONSTANTS.OTHER_PROCESS_NAME, Slug: FUNCTION_TEST_CONSTANTS.OTHER_PROCESS_NAME },
          }),
          createMockRawFunctionTrigger()
        );

        await invokeByRef({ name: FUNCTION_TEST_CONSTANTS.NAME });

        expect(mockApiClient.post).toHaveBeenCalledWith(
          FUNCTION_ENDPOINTS.INVOKE(FUNCTION_TEST_CONSTANTS.FOLDER_KEY, FUNCTION_TEST_CONSTANTS.ROUTE),
          FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
          expect.any(Object)
        );
      });

      it('should match names case-insensitively, as Orchestrator does', async () => {
        mockLookup(createMockRawFunctionTrigger({ Name: FUNCTION_TEST_CONSTANTS.PREFIXED_NAME }));

        await invokeByRef({ name: FUNCTION_TEST_CONSTANTS.NAME.toUpperCase() });

        expect(mockApiClient.post).toHaveBeenCalledTimes(1);
      });

      it('should not treat a different function whose name ends the same way as a match', async () => {
        // Name lookup returns only the look-alike, then the folder's names are listed for the error.
        mockApiClient.get
          .mockResolvedValueOnce({ value: [createMockRawFunctionTrigger({ Name: FUNCTION_TEST_CONSTANTS.LOOKALIKE_NAME })] })
          .mockResolvedValueOnce({ value: [{ Name: FUNCTION_TEST_CONSTANTS.LOOKALIKE_NAME }] });

        await expect(invokeByRef({ name: FUNCTION_TEST_CONSTANTS.NAME })).rejects.toBeInstanceOf(NotFoundError);
        expect(mockApiClient.post).not.toHaveBeenCalled();
      });

      it('should ask for processName when several processes declare the same function name', async () => {
        mockLookup(
          createMockRawFunctionTrigger({ Name: FUNCTION_TEST_CONSTANTS.PREFIXED_NAME }),
          createMockRawFunctionTrigger({
            Name: FUNCTION_TEST_CONSTANTS.OTHER_PREFIXED_NAME,
            Release: { Name: FUNCTION_TEST_CONSTANTS.OTHER_PROCESS_NAME, Slug: FUNCTION_TEST_CONSTANTS.OTHER_PROCESS_NAME },
          })
        );

        const invocation = invokeByRef({ name: FUNCTION_TEST_CONSTANTS.NAME });

        await expect(invocation).rejects.toBeInstanceOf(ValidationError);
        await expect(invocation).rejects.toThrow(
          `${FUNCTION_TEST_CONSTANTS.PROCESS_NAME}, ${FUNCTION_TEST_CONSTANTS.OTHER_PROCESS_NAME}. Pass processName`
        );
        expect(mockApiClient.post).not.toHaveBeenCalled();
      });

      it('should narrow the lookup to one process when processName is given', async () => {
        mockLookup(createMockRawFunctionTrigger({ Name: FUNCTION_TEST_CONSTANTS.PREFIXED_NAME }));

        await invokeByRef({ name: FUNCTION_TEST_CONSTANTS.NAME, processName: FUNCTION_TEST_CONSTANTS.PROCESS_NAME });

        expect(lookupFilter()).toBe(
          `Release/Name eq '${FUNCTION_TEST_CONSTANTS.PROCESS_NAME}' and ` +
            `(Name eq '${FUNCTION_TEST_CONSTANTS.NAME}' or Name eq '${FUNCTION_TEST_CONSTANTS.PREFIXED_NAME}')`
        );
        expect(mockApiClient.post).toHaveBeenCalledTimes(1);
      });

      it('should name the process in the error when processName matches nothing', async () => {
        mockApiClient.get
          .mockResolvedValueOnce({ value: [] })
          .mockResolvedValueOnce({ value: [] });

        await expect(
          invokeByRef({ name: FUNCTION_TEST_CONSTANTS.NAME, processName: FUNCTION_TEST_CONSTANTS.OTHER_PROCESS_NAME })
        ).rejects.toThrow(`in process '${FUNCTION_TEST_CONSTANTS.OTHER_PROCESS_NAME}'`);
      });

      it('should reject an empty processName without calling the API', async () => {
        await expect(
          invokeByRef({ name: FUNCTION_TEST_CONSTANTS.NAME, processName: ' ' })
        ).rejects.toBeInstanceOf(ValidationError);

        expect(mockApiClient.get).not.toHaveBeenCalled();
      });

      it('should escape single quotes in the name filter', async () => {
        mockLookup(createMockRawFunctionTrigger({ Name: FUNCTION_TEST_CONSTANTS.QUOTED_NAME }));

        await invokeByRef({ name: FUNCTION_TEST_CONSTANTS.QUOTED_NAME });

        const escaped = FUNCTION_TEST_CONSTANTS.QUOTED_NAME_ESCAPED;
        expect(lookupFilter()).toBe(`Name eq '${escaped}' or endswith(Name,'_${escaped}')`);
      });

      it('should route by the function slug alone when the ExternalReference has no process segment', async () => {
        mockLookup(
          createMockRawFunctionTrigger({
            Name: FUNCTION_TEST_CONSTANTS.PREFIXED_NAME,
            ExternalReference: FUNCTION_TEST_CONSTANTS.EXTERNAL_REFERENCE_NO_PROCESS_SLUG,
            Release: { Name: FUNCTION_TEST_CONSTANTS.PROCESS_NAME, Slug: null },
          })
        );

        await invokeByRef({ name: FUNCTION_TEST_CONSTANTS.NAME });

        expect(mockApiClient.post).toHaveBeenCalledWith(
          FUNCTION_ENDPOINTS.INVOKE(FUNCTION_TEST_CONSTANTS.FOLDER_KEY, FUNCTION_TEST_CONSTANTS.SLUG),
          FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
          expect.any(Object)
        );
      });

      it('should derive a slug-only route when there is no ExternalReference and the process has no slug', async () => {
        mockLookup(
          createMockRawFunctionTrigger({
            ExternalReference: null,
            Release: { Name: FUNCTION_TEST_CONSTANTS.PROCESS_NAME, Slug: null },
          })
        );

        await invokeByRef({ name: FUNCTION_TEST_CONSTANTS.NAME });

        expect(mockApiClient.post).toHaveBeenCalledWith(
          FUNCTION_ENDPOINTS.INVOKE(FUNCTION_TEST_CONSTANTS.FOLDER_KEY, FUNCTION_TEST_CONSTANTS.SLUG),
          FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
          expect.any(Object)
        );
      });
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

    it('should keep the original error and warn when the name listing itself fails', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const listError = createMockError();
      mockApiClient.get
        .mockResolvedValueOnce({ value: [] })
        .mockRejectedValueOnce(listError);

      await expect(
        functionService.invoke(
          { name: FUNCTION_TEST_CONSTANTS.NAME },
          FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
          { folderId: TEST_CONSTANTS.FOLDER_ID }
        )
      ).rejects.toThrow(NotFoundError);
      expect(warn).toHaveBeenCalledWith(expect.any(String), listError);

      warn.mockRestore();
    });

    it('should throw ValidationError when no folder context is available', async () => {
      await expect(
        functionService.invoke({ name: FUNCTION_TEST_CONSTANTS.NAME }, FUNCTION_TEST_CONSTANTS.INVOKE_INPUT)
      ).rejects.toThrow(ValidationError);

      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should propagate errors from the function invocation', async () => {
      mockApiClient.get.mockResolvedValueOnce({ value: [createMockRawFunctionTrigger()] });
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

  describe('licensing', () => {
    it('should not acquire a license when invoking', async () => {
      mockApiClient.get.mockResolvedValueOnce({ value: [createMockRawFunctionTrigger()] });
      mockApiClient.post.mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);

      await functionService.invoke({ name: FUNCTION_TEST_CONSTANTS.NAME }, FUNCTION_TEST_CONSTANTS.INVOKE_INPUT, {
        folderKey: FUNCTION_TEST_CONSTANTS.FOLDER_KEY,
      });

      expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('parseExternalReference', () => {
    it('should read the route and a lower-cased folder key', () => {
      expect(parseExternalReference(FUNCTION_TEST_CONSTANTS.EXTERNAL_REFERENCE)).toEqual({
        route: FUNCTION_TEST_CONSTANTS.ROUTE,
        folderKey: FUNCTION_TEST_CONSTANTS.FOLDER_KEY,
      });
    });

    it('should read a route without a process segment', () => {
      expect(parseExternalReference(FUNCTION_TEST_CONSTANTS.EXTERNAL_REFERENCE_NO_PROCESS_SLUG)?.route).toBe(
        FUNCTION_TEST_CONSTANTS.SLUG
      );
    });

    it('should keep path parameters in the route', () => {
      expect(parseExternalReference(FUNCTION_TEST_CONSTANTS.EXTERNAL_REFERENCE_PARAM)?.route).toBe(
        `${FUNCTION_TEST_CONSTANTS.PROCESS_SLUG}/${FUNCTION_TEST_CONSTANTS.PARAM_SLUG}`
      );
    });

    it('should return undefined when the reference is absent', () => {
      expect(parseExternalReference(null)).toBeUndefined();
      expect(parseExternalReference(undefined)).toBeUndefined();
    });

    it('should return undefined when the reference does not end in a folder key', () => {
      expect(parseExternalReference(`${FUNCTION_TEST_CONSTANTS.METHOD} ${FUNCTION_TEST_CONSTANTS.ROUTE}`)).toBeUndefined();
    });

    it('should return undefined when the route contains a space', () => {
      expect(parseExternalReference(FUNCTION_TEST_CONSTANTS.EXTERNAL_REFERENCE_SPACED_ROUTE)).toBeUndefined();
    });

    it('should return undefined when the route is only slashes', () => {
      expect(
        parseExternalReference(`${FUNCTION_TEST_CONSTANTS.METHOD} / ${FUNCTION_TEST_CONSTANTS.FOLDER_KEY}`)
      ).toBeUndefined();
    });
  });

  describe('buildInvokeRoute', () => {
    const fn = { name: FUNCTION_TEST_CONSTANTS.NAME, slug: FUNCTION_TEST_CONSTANTS.SLUG, processSlug: FUNCTION_TEST_CONSTANTS.PROCESS_SLUG };

    it('should join the process slug and the function slug', () => {
      expect(buildInvokeRoute(fn)).toBe(FUNCTION_TEST_CONSTANTS.ROUTE);
    });

    it('should use the function slug alone when the process slug is null', () => {
      expect(buildInvokeRoute({ ...fn, processSlug: null })).toBe(FUNCTION_TEST_CONSTANTS.SLUG);
    });

    it('should use the function slug alone when the process slug is empty', () => {
      expect(buildInvokeRoute({ ...fn, processSlug: '' })).toBe(FUNCTION_TEST_CONSTANTS.SLUG);
    });

    it('should strip leading and trailing slashes from both segments', () => {
      expect(
        buildInvokeRoute({ ...fn, slug: `/${FUNCTION_TEST_CONSTANTS.SLUG}/`, processSlug: `/${FUNCTION_TEST_CONSTANTS.PROCESS_SLUG}/` })
      ).toBe(FUNCTION_TEST_CONSTANTS.ROUTE);
    });

    it('should throw ServerError when the function has no slug', () => {
      expect(() => buildInvokeRoute({ ...fn, slug: '' })).toThrow(ServerError);
    });
  });

});
