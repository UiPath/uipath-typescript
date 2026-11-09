import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OntologyService } from '@/services/ontology/ontology';
import { OntologyArtifactType } from '@/models/ontology/ontology.types';
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
    it('should call PaginationHelpers.getAll with correct pagination config', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({
        items: [createMockRawOntology()],
        totalCount: 1,
      });

      await service.getAll();

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
          excludeFromPrefix: ['search', 'folder'],
        }),
        undefined
      );
    });

    it('should rename createTime and updateTime to createdTime and updatedTime', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

      await service.getAll();

      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      const item = config.transformFn!(createMockRawOntology({ updateTime: ONTOLOGY_TEST_CONSTANTS.UPDATE_TIME })) as OntologyGetResponse;
      expect(item.createdTime).toBe(ONTOLOGY_TEST_CONSTANTS.CREATE_TIME);
      expect(item.updatedTime).toBe(ONTOLOGY_TEST_CONSTANTS.UPDATE_TIME);
      expect(item).not.toHaveProperty('createTime');
      expect(item).not.toHaveProperty('updateTime');
    });

    it('should send folderKey as the folder query parameter, not a header', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

      await service.getAll({ folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY });

      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      const params = config.processParametersFn!({ folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY });
      expect(params).toEqual({ folder: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY });
      expect(config.headers?.[FOLDER_KEY]).toBeUndefined();
      expect(config.excludeFromPrefix).toEqual(expect.arrayContaining(['search', 'folder']));
    });

    it('should fall back to the configured folder key for the folder query parameter', async () => {
      const { instance } = createServiceTestDependencies({ folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY });
      const folderService = new OntologyService(instance);
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

      await folderService.getAll();

      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      expect(config.processParametersFn!({})).toEqual({ folder: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY });
    });

    it('should send no folder when neither an option nor a configured folder key is set', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

      await service.getAll();

      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      expect(config.processParametersFn!({})).toEqual({ folder: undefined });
    });

    it('should target the collection endpoint and return each item with SDK field names', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

      await service.getAll();

      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      expect(config.getEndpoint()).toBe(ONTOLOGY_ENDPOINTS.COLLECTION);
      const raw = createMockRawOntology();
      const { createTime, folderId, ...rest } = raw;
      expect(config.transformFn!(raw)).toEqual({ ...rest, createdTime: createTime, folderKey: folderId });
    });

    it('should propagate API errors', async () => {
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE)
      );

      await expect(service.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
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

    it('should URL-encode the name in the api v1 path', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawOntology());

      await service.getById('Sales Ops');

      expect(mockApiClient.get).toHaveBeenCalledWith('ontology_/api/v1/ontology/Sales%20Ops', expect.anything());
    });

    it('should also accept a name as idOrName', async () => {
      const raw = createMockRawOntology();
      mockApiClient.get.mockResolvedValue(raw);

      await service.getById(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ONTOLOGY_ENDPOINTS.BY_ID(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME),
        expect.any(Object)
      );
    });

    it('should send the folder key header when given', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawOntology());

      await service.getById(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME, { folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ONTOLOGY_ENDPOINTS.BY_ID(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME),
        expect.objectContaining({ headers: expect.objectContaining({ [FOLDER_KEY]: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY }) })
      );
    });

    it('should send no folder header without a folder', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawOntology());

      await service.getById(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME);

      expect(mockApiClient.get.mock.calls[0][1]?.headers?.[FOLDER_KEY]).toBeUndefined();
    });

    it('should fall back to the configured folder key for the header', async () => {
      const { instance } = createServiceTestDependencies({ folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY });
      const folderService = new OntologyService(instance);
      mockApiClient.get.mockResolvedValue(createMockRawOntology());

      await folderService.getById(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME);

      expect(mockApiClient.get.mock.calls[0][1]?.headers?.[FOLDER_KEY]).toBe(ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY);
    });

    it('should return the folder the service reports as folderKey', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawOntology({ folderId: ONTOLOGY_TEST_CONSTANTS.OTHER_FOLDER_KEY }));

      const result = await service.getById(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME, { folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY });

      expect(result.folderKey).toBe(ONTOLOGY_TEST_CONSTANTS.OTHER_FOLDER_KEY);
      expect(result).not.toHaveProperty('folderId');
    });

    it('should reject with NotFoundError on 404', async () => {
      mockApiClient.get.mockRejectedValue(new NotFoundError({ message: ONTOLOGY_TEST_CONSTANTS.ERROR_NOT_FOUND }));

      await expect(service.getById('Missing')).rejects.toBeInstanceOf(NotFoundError);
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
