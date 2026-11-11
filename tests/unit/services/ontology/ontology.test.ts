import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OntologyService } from '@/services/ontology/ontology';
import { OntologyArtifactType, OntologyState } from '@/models/ontology/ontology.types';
import type { OntologyGetResponse } from '@/models/ontology/ontology.types';
import { PaginationHelpers } from '@/utils/pagination/helpers';
import { ApiClient } from '@/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '@tests/utils/setup';
import {
  createMockRawOntology,
  createMockValidationResult,
  createMockValidationFailure,
} from '@tests/utils/mocks/ontology';
import { createMockError } from '@tests/utils/mocks/core';
import { NotFoundError } from '@/core/errors';
import { ONTOLOGY_TEST_CONSTANTS } from '@tests/utils/constants/ontology';
import { TEST_CONSTANTS } from '@tests/utils/constants/common';
import { ONTOLOGY_ENDPOINTS } from '@/utils/constants/endpoints';
import { FOLDER_KEY } from '@/utils/constants/headers';
import { OVERRIDE_TEST_CONSTANTS } from '@tests/utils/constants/overrides';

vi.mock('@/core/http/api-client');

const mocks = vi.hoisted(() => import('@tests/utils/mocks/core'));
vi.mock('@/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

describe('OntologyService Unit Tests', () => {
  let service: OntologyService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });
    vi.mocked(PaginationHelpers.getAll).mockReset();
    service = new OntologyService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    describe('with pagination options', () => {
      const paged = { pageSize: ONTOLOGY_TEST_CONSTANTS.PAGE_SIZE };

      it('should call PaginationHelpers.getAll with correct pagination config', async () => {
        vi.mocked(PaginationHelpers.getAll).mockResolvedValue({
          items: [createMockRawOntology()],
          totalCount: 1,
        });

        await service.getAll(paged);

        expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
          expect.objectContaining({
            pagination: expect.objectContaining({
              itemsField: 'items',
              totalCountField: 'total',
              paginationParams: expect.objectContaining({
                pageSizeParam: 'limit',
                offsetParam: 'page',
                convertToSkip: false,
                zeroBased: false,
              }),
            }),
            excludeFromPrefix: ['search', 'state', 'folder'],
          }),
          paged
        );
        expect(mockApiClient.get).not.toHaveBeenCalled();
      });

      it('should rename createTime and updateTime to createdTime and updatedTime', async () => {
        vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

        await service.getAll(paged);

        const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
        const item = config.transformFn!(createMockRawOntology({ updateTime: ONTOLOGY_TEST_CONSTANTS.UPDATE_TIME })) as OntologyGetResponse;
        expect(item.createdTime).toBe(ONTOLOGY_TEST_CONSTANTS.CREATE_TIME);
        expect(item.updatedTime).toBe(ONTOLOGY_TEST_CONSTANTS.UPDATE_TIME);
        expect(item).not.toHaveProperty('createTime');
        expect(item).not.toHaveProperty('updateTime');
      });

      it('should send folderKey as the folder query parameter, not a header', async () => {
        vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

        await service.getAll({ ...paged, folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY });

        const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
        expect(config.processParametersFn!({ folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY })).toEqual({
          folder: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY,
        });
        expect(config.headers?.[FOLDER_KEY]).toBeUndefined();
      });

      it('should send state unprefixed alongside the folder', async () => {
        vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });
        const options = { ...paged, folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY, state: OntologyState.Deployed };

        await service.getAll(options);

        const [config, passedOptions] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
        expect(passedOptions).toEqual(options);
        expect(config.processParametersFn!({ folderKey: options.folderKey, state: options.state })).toEqual({
          state: OntologyState.Deployed,
          folder: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY,
        });
        expect(config.excludeFromPrefix).toContain('state');
      });

      it('should list every folder without folderKey, even with a configured folder key', async () => {
        const { instance } = createServiceTestDependencies({ folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY });
        const folderService = new OntologyService(instance);
        vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

        await folderService.getAll(paged);

        const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
        expect(config.processParametersFn!({})).toEqual({ folder: undefined });
      });

      it('should target the collection endpoint and return each item with SDK field names', async () => {
        vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

        await service.getAll(paged);

        const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
        expect(config.getEndpoint()).toBe(ONTOLOGY_ENDPOINTS.COLLECTION);
        const raw = createMockRawOntology();
        const { createTime, folderId, ...rest } = raw;
        expect(config.transformFn!(raw)).toEqual({ ...rest, createdTime: createTime, folderKey: folderId });
      });

      it('should propagate API errors', async () => {
        vi.mocked(PaginationHelpers.getAll).mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

        await expect(service.getAll(paged)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
      });
    });

    describe('without pagination options', () => {
      const MAX = ONTOLOGY_TEST_CONSTANTS.MAX_PAGE_SIZE;
      const ontologies = (count: number, start = 0) =>
        Array.from({ length: count }, (_, i) =>
          createMockRawOntology({ id: `${ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID}-${start + i}` })
        );
      const listPage = (items: ReturnType<typeof ontologies>, page: number, total: number) => ({
        items,
        page,
        limit: MAX,
        total,
      });

      it('should fetch one full-size page from the collection and return items with SDK field names', async () => {
        const raw = createMockRawOntology();
        mockApiClient.get.mockResolvedValue(listPage([raw], 1, 1));

        const result = await service.getAll();

        expect(PaginationHelpers.getAll).not.toHaveBeenCalled();
        expect(mockApiClient.get).toHaveBeenCalledTimes(1);
        expect(mockApiClient.get).toHaveBeenCalledWith(
          ONTOLOGY_ENDPOINTS.COLLECTION,
          expect.objectContaining({ params: expect.objectContaining({ page: 1, limit: MAX }) })
        );
        const { createTime, folderId, ...rest } = raw;
        expect(result).toEqual({ items: [{ ...rest, createdTime: createTime, folderKey: folderId }], totalCount: 1 });
        expect(result.items[0]).not.toHaveProperty('createTime');
        expect(result.items[0]).not.toHaveProperty('folderId');
      });

      it('should rename updateTime to updatedTime and remove the wire field', async () => {
        mockApiClient.get.mockResolvedValue(
          listPage([createMockRawOntology({ updateTime: ONTOLOGY_TEST_CONSTANTS.UPDATE_TIME })], 1, 1)
        );

        const result = await service.getAll();

        expect(result.items[0].updatedTime).toBe(ONTOLOGY_TEST_CONSTANTS.UPDATE_TIME);
        expect(result.items[0]).not.toHaveProperty('updateTime');
      });

      it('should keep fetching until a short page and combine every page', async () => {
        mockApiClient.get
          .mockResolvedValueOnce(listPage(ontologies(MAX), 1, MAX + 1))
          .mockResolvedValueOnce(listPage(ontologies(1, MAX), 2, MAX + 1));

        const result = await service.getAll();

        expect(mockApiClient.get).toHaveBeenCalledTimes(2);
        expect(mockApiClient.get.mock.calls[1][1]?.params).toEqual(expect.objectContaining({ page: 2, limit: MAX }));
        expect(result.items).toHaveLength(MAX + 1);
        expect(result.totalCount).toBe(MAX + 1);
      });

      it('should stop after a full final page once the total is reached', async () => {
        mockApiClient.get.mockResolvedValue(listPage(ontologies(MAX), 1, MAX));

        const result = await service.getAll();

        expect(mockApiClient.get).toHaveBeenCalledTimes(1);
        expect(result.items).toHaveLength(MAX);
      });

      it('should not count an ontology twice when it appears on two pages', async () => {
        mockApiClient.get
          .mockResolvedValueOnce(listPage(ontologies(MAX), 1, MAX + 1))
          .mockResolvedValueOnce(listPage(ontologies(2, MAX - 1), 2, MAX + 1));

        const result = await service.getAll();

        expect(result.items).toHaveLength(MAX + 1);
      });

      it('should send search, state and folderKey as query parameters', async () => {
        mockApiClient.get.mockResolvedValue(listPage([], 1, 0));

        await service.getAll({
          search: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME,
          state: OntologyState.Deployed,
          folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY,
        });

        expect(mockApiClient.get.mock.calls[0][1]?.params).toEqual({
          search: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME,
          state: OntologyState.Deployed,
          folder: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY,
          page: 1,
          limit: MAX,
        });
        expect(mockApiClient.get.mock.calls[0][1]?.headers?.[FOLDER_KEY]).toBeUndefined();
      });

      it('should list every folder without folderKey, even with a configured folder key', async () => {
        const { instance } = createServiceTestDependencies({ folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY });
        const folderService = new OntologyService(instance);
        mockApiClient.get.mockResolvedValue(listPage([], 1, 0));

        await folderService.getAll();

        expect(mockApiClient.get.mock.calls[0][1]?.params?.folder).toBeUndefined();
      });

      it('should propagate API errors', async () => {
        mockApiClient.get.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

        await expect(service.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
      });
    });
  });

  describe('getById', () => {
    it('should return the ontology', async () => {
      const raw = createMockRawOntology();
      mockApiClient.get.mockResolvedValue(raw);

      const result = await service.getById(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ONTOLOGY_ENDPOINTS.BY_ID(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID),
        expect.any(Object)
      );
      const { createTime, folderId, ...rest } = raw;
      expect(result).toEqual({ ...rest, createdTime: createTime, folderKey: folderId });
      expect(result).not.toHaveProperty('createTime');
      expect(result).not.toHaveProperty('folderId');
    });

    it('should rename createTime and updateTime to createdTime and updatedTime', async () => {
      mockApiClient.get.mockResolvedValue(
        createMockRawOntology({ updateTime: ONTOLOGY_TEST_CONSTANTS.UPDATE_TIME })
      );

      const result = await service.getById(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID);

      expect(result.createdTime).toBe(ONTOLOGY_TEST_CONSTANTS.CREATE_TIME);
      expect(result.updatedTime).toBe(ONTOLOGY_TEST_CONSTANTS.UPDATE_TIME);
      expect(result).not.toHaveProperty('createTime');
      expect(result).not.toHaveProperty('updateTime');
    });

    it('should send the folder key header when given', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawOntology());

      await service.getById(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID, { folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ONTOLOGY_ENDPOINTS.BY_ID(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID),
        expect.objectContaining({ headers: expect.objectContaining({ [FOLDER_KEY]: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY }) })
      );
    });

    it('should send no folder header without a folder', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawOntology());

      await service.getById(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID);

      expect(mockApiClient.get.mock.calls[0][1]?.headers?.[FOLDER_KEY]).toBeUndefined();
    });

    it('should fall back to the configured folder key for the header', async () => {
      const { instance } = createServiceTestDependencies({ folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY });
      const folderService = new OntologyService(instance);
      mockApiClient.get.mockResolvedValue(createMockRawOntology());

      await folderService.getById(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID);

      expect(mockApiClient.get.mock.calls[0][1]?.headers?.[FOLDER_KEY]).toBe(ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY);
    });

    it('should return the folder the service reports as folderKey', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawOntology({ folderId: ONTOLOGY_TEST_CONSTANTS.OTHER_FOLDER_KEY }));

      const result = await service.getById(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID, { folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY });

      expect(result.folderKey).toBe(ONTOLOGY_TEST_CONSTANTS.OTHER_FOLDER_KEY);
      expect(result).not.toHaveProperty('folderId');
    });

    it('should not apply a name override to an ID', async () => {
      const OVERRIDE_KEY = Symbol.for(OVERRIDE_TEST_CONSTANTS.CHANNEL_KEY);
      (globalThis as Record<symbol, unknown>)[OVERRIDE_KEY] = () => ({
        [`ontology.${ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID}`]: { name: OVERRIDE_TEST_CONSTANTS.TARGET_NAME },
      });

      try {
        mockApiClient.get.mockResolvedValue(createMockRawOntology());

        await service.getById(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID);

        expect(mockApiClient.get).toHaveBeenCalledWith(
          ONTOLOGY_ENDPOINTS.BY_ID(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID),
          expect.anything()
        );
      } finally {
        delete (globalThis as Record<symbol, unknown>)[OVERRIDE_KEY];
      }
    });

    it('should reject with NotFoundError on 404', async () => {
      mockApiClient.get.mockRejectedValue(new NotFoundError({ message: ONTOLOGY_TEST_CONSTANTS.ERROR_NOT_FOUND }));

      await expect(service.getById(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('getByName', () => {
    it('should return the ontology with SDK field names', async () => {
      const raw = createMockRawOntology({ updateTime: ONTOLOGY_TEST_CONSTANTS.UPDATE_TIME });
      mockApiClient.get.mockResolvedValue(raw);

      const result = await service.getByName(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ONTOLOGY_ENDPOINTS.BY_ID(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME),
        expect.any(Object)
      );
      const { createTime, updateTime, folderId, ...rest } = raw;
      expect(result).toEqual({ ...rest, createdTime: createTime, updatedTime: updateTime, folderKey: folderId });
      expect(result).not.toHaveProperty('createTime');
      expect(result).not.toHaveProperty('updateTime');
      expect(result).not.toHaveProperty('folderId');
    });

    it('should URL-encode the name in the api v1 path', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawOntology());

      await service.getByName(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME_WITH_SPACE);

      expect(mockApiClient.get).toHaveBeenCalledWith(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME_WITH_SPACE_PATH, expect.anything());
    });

    it('should send the folder key header when given', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawOntology());

      await service.getByName(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME, { folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY });

      expect(mockApiClient.get.mock.calls[0][1]?.headers?.[FOLDER_KEY]).toBe(ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY);
    });

    it('should fall back to the configured folder key for the header', async () => {
      const { instance } = createServiceTestDependencies({ folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY });
      const folderService = new OntologyService(instance);
      mockApiClient.get.mockResolvedValue(createMockRawOntology());

      await folderService.getByName(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME);

      expect(mockApiClient.get.mock.calls[0][1]?.headers?.[FOLDER_KEY]).toBe(ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY);
    });

    it('should redirect the name when a runtime override matches (unscoped ontology.<name> key)', async () => {
      // The route takes a folder key, so only the redirected name is applied.
      const OVERRIDE_KEY = Symbol.for(OVERRIDE_TEST_CONSTANTS.CHANNEL_KEY);
      (globalThis as Record<symbol, unknown>)[OVERRIDE_KEY] = () => ({
        [`ontology.${ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME}`]: {
          name: OVERRIDE_TEST_CONSTANTS.TARGET_NAME,
          folderPath: OVERRIDE_TEST_CONSTANTS.TARGET_FOLDER_PATH,
        },
      });

      try {
        mockApiClient.get.mockResolvedValue(createMockRawOntology());

        await service.getByName(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME, { folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY });

        expect(mockApiClient.get).toHaveBeenCalledWith(
          ONTOLOGY_ENDPOINTS.BY_ID(OVERRIDE_TEST_CONSTANTS.TARGET_NAME),
          expect.objectContaining({ headers: { [FOLDER_KEY]: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY } })
        );
      } finally {
        delete (globalThis as Record<symbol, unknown>)[OVERRIDE_KEY];
      }
    });

    it('should keep the name when no override matches', async () => {
      const OVERRIDE_KEY = Symbol.for(OVERRIDE_TEST_CONSTANTS.CHANNEL_KEY);
      (globalThis as Record<symbol, unknown>)[OVERRIDE_KEY] = () => ({
        [`entity.${ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME}`]: { name: OVERRIDE_TEST_CONSTANTS.TARGET_NAME },
      });

      try {
        mockApiClient.get.mockResolvedValue(createMockRawOntology());

        await service.getByName(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME);

        expect(mockApiClient.get).toHaveBeenCalledWith(
          ONTOLOGY_ENDPOINTS.BY_ID(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME),
          expect.anything()
        );
      } finally {
        delete (globalThis as Record<symbol, unknown>)[OVERRIDE_KEY];
      }
    });

    it('should reject with NotFoundError on 404', async () => {
      mockApiClient.get.mockRejectedValue(new NotFoundError({ message: ONTOLOGY_TEST_CONSTANTS.ERROR_NOT_FOUND }));

      await expect(service.getByName(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('validateArtifactContent', () => {
    it('should POST raw content to the ontology-free route with the type param', async () => {
      mockApiClient.post.mockResolvedValue(createMockValidationResult({ type: OntologyArtifactType.Constraints }));

      await service.validateArtifactContent(
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_SHACL,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_MEDIA_TYPE_TURTLE,
        { type: OntologyArtifactType.Constraints }
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        'ontology_/api/v1/artifact/po-shapes.ttl/validate',
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_SHACL,
        expect.objectContaining({
          params: { type: OntologyArtifactType.Constraints },
          headers: { 'Content-Type': ONTOLOGY_TEST_CONSTANTS.ARTIFACT_MEDIA_TYPE_TURTLE },
          bodyOptions: { stringify: false },
        })
      );
    });

    it('should omit type when not given', async () => {
      mockApiClient.post.mockResolvedValue(createMockValidationResult());

      await service.validateArtifactContent(
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_SHACL,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_MEDIA_TYPE_TURTLE
      );

      expect(mockApiClient.post.mock.calls[0][0]).toBe('ontology_/api/v1/artifact/po-shapes.ttl/validate');
      expect(mockApiClient.post.mock.calls[0][2]?.params?.type).toBeUndefined();
    });

    it('should encode the file name', async () => {
      mockApiClient.post.mockResolvedValue(createMockValidationResult());

      await service.validateArtifactContent(
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME_SPECIAL,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_SHACL,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_MEDIA_TYPE_TURTLE
      );

      expect(mockApiClient.post.mock.calls[0][0]).toBe('ontology_/api/v1/artifact/my%20file%231.ttl/validate');
    });

    it('should pass JSON-looking content through as the identical string', async () => {
      mockApiClient.post.mockResolvedValue(createMockValidationResult());
      const content = ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_YAML_FLOW;

      await service.validateArtifactContent(
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME,
        content,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_MEDIA_TYPE_TURTLE
      );

      expect(mockApiClient.post.mock.calls[0][1]).toBe(content);
    });

    it('should return an invalid report as data', async () => {
      mockApiClient.post.mockResolvedValue(createMockValidationFailure());

      const result = await service.validateArtifactContent(
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME,
        'bad turtle',
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_MEDIA_TYPE_TURTLE
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        service.validateArtifactContent(
          ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME,
          ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_SHACL,
          ONTOLOGY_TEST_CONSTANTS.ARTIFACT_MEDIA_TYPE_TURTLE
        )
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
