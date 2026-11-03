import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OntologyService } from '../../../../src/services/ontology/ontology';
import { ArtifactType } from '../../../../src/models/ontology/ontology.types';
import type { OntologySummary } from '../../../../src/models/ontology/ontology.models';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import {
  createMockRawOntology,
  createMockArtifactMetadata,
  createMockValidationResult,
  createMockValidationFailure,
} from '../../../utils/mocks/ontology';
import { createMockError } from '../../../utils/mocks/core';
import { ValidationError, NotFoundError } from '../../../../src/core/errors';
import { ONTOLOGY_TEST_CONSTANTS } from '../../../utils/constants/ontology';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { ONTOLOGY_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { FOLDER_KEY } from '../../../../src/utils/constants/headers';

vi.mock('../../../../src/core/http/api-client');

const mocks = vi.hoisted(() => import('../../../utils/mocks/core'));
vi.mock('../../../../src/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

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

  // ===== ONTOLOGY CRUD =====

  describe('create', () => {
    it('should create an ontology and return it with bound methods', async () => {
      const raw = createMockRawOntology();
      mockApiClient.post.mockResolvedValue(raw);

      const result = await service.create(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME, {
        displayName: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_DISPLAY_NAME,
        description: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_DESCRIPTION,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        ONTOLOGY_ENDPOINTS.COLLECTION,
        expect.objectContaining({
          name: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME,
          displayName: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_DISPLAY_NAME,
        }),
        expect.any(Object)
      );
      expect(result.id).toBe(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID);
      expect(result.name).toBe(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME);
      expect(result.displayName).toBe(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_DISPLAY_NAME);
      expect(typeof result.update).toBe('function');
      expect(typeof result.deleteById).toBe('function');
      expect(typeof result.listArtifacts).toBe('function');
    });

    it('should pass folderKey as header, not body', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawOntology());

      await service.create(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME, {
        folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY,
      });

      const [, body, opts] = mockApiClient.post.mock.calls[0];
      expect(body).not.toHaveProperty('folderKey');
      expect(opts.headers[FOLDER_KEY]).toBe(ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY);
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(ONTOLOGY_TEST_CONSTANTS.ERROR_CONFLICT));

      await expect(service.create(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME)).rejects.toThrow(
        ONTOLOGY_TEST_CONSTANTS.ERROR_CONFLICT
      );
    });
  });

  describe('getAll', () => {
    it('should call PaginationHelpers.getAll with correct pagination config', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({
        items: [createMockRawOntology()],
        totalCount: 1,
      } as any);

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
        expect.any(Object)
      );
    });

    it('should carry folderId on items through transformFn', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 } as any);

      await service.getAll();

      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      const item = config.transformFn!(createMockRawOntology({ folderId: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY }) as any) as OntologySummary;
      expect(item.folderId).toBe(ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY);
    });

    it('should send folderKey as the folder query parameter, not a header', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 } as any);

      await service.getAll({ folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY });

      const [config, opts] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      expect(opts).toEqual(expect.objectContaining({ folder: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY }));
      expect(opts).not.toHaveProperty('folderKey');
      expect(config.headers?.[FOLDER_KEY]).toBeUndefined();
      expect(config.excludeFromPrefix).toEqual(expect.arrayContaining(['search', 'folder']));
    });

    it('should target the api v1 collection route', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 } as any);

      await service.getAll();

      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      expect(config.getEndpoint()).toBe('ontology_/api/v1/ontology');
    });

    it('should target the collection endpoint and attach bound methods to each item', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 } as any);

      await service.getAll();

      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      expect(config.getEndpoint()).toBe(ONTOLOGY_ENDPOINTS.COLLECTION);
      const item = config.transformFn!(createMockRawOntology()) as OntologySummary;
      expect(item.id).toBe(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID);
      expect(typeof item.deleteById).toBe('function');
    });

    it('should propagate API errors', async () => {
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE)
      );

      await expect(service.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getById', () => {
    it('should return an ontology with bound methods', async () => {
      const raw = createMockRawOntology();
      mockApiClient.get.mockResolvedValue(raw);

      const result = await service.getById(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ONTOLOGY_ENDPOINTS.BY_ID(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID),
        expect.any(Object)
      );
      expect(result.id).toBe(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID);
      expect(typeof result.update).toBe('function');
      expect(typeof result.deleteById).toBe('function');
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

    it('should return the folderId the service sends', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawOntology({ folderId: ONTOLOGY_TEST_CONSTANTS.OTHER_FOLDER_KEY }));

      const result = await service.getById(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME, { folderKey: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY });

      expect(result.folderId).toBe(ONTOLOGY_TEST_CONSTANTS.OTHER_FOLDER_KEY);
      expect(typeof result.update).toBe('function');
    });

    it('should reject with NotFoundError on 404', async () => {
      mockApiClient.get.mockRejectedValue(new NotFoundError({ message: ONTOLOGY_TEST_CONSTANTS.ERROR_NOT_FOUND }));

      await expect(service.getById('Missing')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should propagate 404 errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(ONTOLOGY_TEST_CONSTANTS.ERROR_NOT_FOUND));

      await expect(service.getById(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID)).rejects.toThrow(
        ONTOLOGY_TEST_CONSTANTS.ERROR_NOT_FOUND
      );
    });
  });

  describe('update', () => {
    it('should update metadata and return updated ontology with bound methods', async () => {
      const raw = createMockRawOntology({ displayName: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_DISPLAY_NAME_ALT });
      mockApiClient.patch.mockResolvedValue(raw);

      const result = await service.update(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID, {
        displayName: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_DISPLAY_NAME_ALT,
      });

      expect(mockApiClient.patch).toHaveBeenCalledWith(
        ONTOLOGY_ENDPOINTS.BY_ID(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID),
        { displayName: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_DISPLAY_NAME_ALT },
        expect.any(Object)
      );
      expect(result.displayName).toBe(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_DISPLAY_NAME_ALT);
      expect(typeof result.deleteById).toBe('function');
    });

    it('should support renaming via the name field', async () => {
      const raw = createMockRawOntology({ name: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME_2 });
      mockApiClient.patch.mockResolvedValue(raw);

      const result = await service.update(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID, {
        name: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME_2,
      });

      expect(mockApiClient.patch).toHaveBeenCalledWith(
        ONTOLOGY_ENDPOINTS.BY_ID(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID),
        { name: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME_2 },
        expect.any(Object)
      );
      expect(result.name).toBe(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME_2);
    });

    it('should propagate API errors', async () => {
      mockApiClient.patch.mockRejectedValue(createMockError(ONTOLOGY_TEST_CONSTANTS.ERROR_NOT_FOUND));

      await expect(service.update(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID, {})).rejects.toThrow(
        ONTOLOGY_TEST_CONSTANTS.ERROR_NOT_FOUND
      );
    });
  });

  describe('deleteById', () => {
    it('should call delete endpoint and return void', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await service.deleteById(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID);

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        ONTOLOGY_ENDPOINTS.BY_ID(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID),
        expect.any(Object)
      );
    });

    it('should propagate 404 errors', async () => {
      mockApiClient.delete.mockRejectedValue(createMockError(ONTOLOGY_TEST_CONSTANTS.ERROR_NOT_FOUND));

      await expect(service.deleteById(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID)).rejects.toThrow(
        ONTOLOGY_TEST_CONSTANTS.ERROR_NOT_FOUND
      );
    });
  });

  // ===== ARTIFACTS =====

  describe('listArtifacts', () => {
    it('should return array of artifact metadata', async () => {
      const artifacts = [
        createMockArtifactMetadata({ fileName: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME }),
        createMockArtifactMetadata({ fileName: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME_2, type: ArtifactType.Constraints }),
      ];
      mockApiClient.get.mockResolvedValue(artifacts);

      const result = await service.listArtifacts(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ONTOLOGY_ENDPOINTS.ARTIFACT.COLLECTION(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID),
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
      expect(result[0].fileName).toBe(ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME);
      expect(result[0].type).toBe(ArtifactType.Schema);
    });

    it('should append ?type= when type filter is provided', async () => {
      const artifacts = [
        createMockArtifactMetadata({ fileName: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME_2, type: ArtifactType.Constraints }),
      ];
      mockApiClient.get.mockResolvedValue(artifacts);

      const result = await service.listArtifacts(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID, { type: ArtifactType.Constraints });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        `${ONTOLOGY_ENDPOINTS.ARTIFACT.COLLECTION(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID)}?type=constraints`,
        expect.any(Object)
      );
      expect(result[0].type).toBe(ArtifactType.Constraints);
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(ONTOLOGY_TEST_CONSTANTS.ERROR_NOT_FOUND));

      await expect(service.listArtifacts(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID)).rejects.toThrow(
        ONTOLOGY_TEST_CONSTANTS.ERROR_NOT_FOUND
      );
    });
  });

  describe('getArtifact', () => {
    it('should request raw text and return content string', async () => {
      mockApiClient.get.mockResolvedValue(ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_OFN);

      const result = await service.getArtifact(
        ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ONTOLOGY_ENDPOINTS.ARTIFACT.BY_NAME(
          ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
          ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME
        ),
        expect.objectContaining({ responseType: 'text' })
      );
      expect(result).toBe(ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_OFN);
    });

    it('should propagate 404 errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(ONTOLOGY_TEST_CONSTANTS.ERROR_NOT_FOUND));

      await expect(
        service.getArtifact(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID, ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME)
      ).rejects.toThrow(ONTOLOGY_TEST_CONSTANTS.ERROR_NOT_FOUND);
    });
  });

  describe('upsertArtifact', () => {
    it('should PUT raw content with Content-Type header and ?type= query param', async () => {
      const metadata = createMockArtifactMetadata();
      mockApiClient.put.mockResolvedValue(metadata);

      const result = await service.upsertArtifact(
        ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME,
        {
          mediaType: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_MEDIA_TYPE_OFN,
          content: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_OFN,
          type: ArtifactType.Schema,
        }
      );

      const expectedUrl = `${ONTOLOGY_ENDPOINTS.ARTIFACT.BY_NAME(
        ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME
      )}?type=${encodeURIComponent(ArtifactType.Schema)}`;
      expect(mockApiClient.put).toHaveBeenCalledWith(
        expectedUrl,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_OFN,
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': ONTOLOGY_TEST_CONSTANTS.ARTIFACT_MEDIA_TYPE_OFN }),
          bodyOptions: { stringify: false },
        })
      );
      expect(result.fileName).toBe(ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME);
      expect(result.type).toBe(ArtifactType.Schema);
      expect(result.sizeBytes).toBe(ONTOLOGY_TEST_CONSTANTS.ARTIFACT_SIZE_BYTES);
    });

    it('should omit ?type= when type is not provided', async () => {
      mockApiClient.put.mockResolvedValue(createMockArtifactMetadata());

      await service.upsertArtifact(
        ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME,
        { mediaType: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_MEDIA_TYPE_OFN, content: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_OFN }
      );

      const [url] = mockApiClient.put.mock.calls[0];
      expect(url).toBe(ONTOLOGY_ENDPOINTS.ARTIFACT.BY_NAME(
        ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME
      ));
      expect(url).not.toContain('?type=');
    });

    it('should propagate 422 validation errors', async () => {
      mockApiClient.put.mockRejectedValue(createMockError(ONTOLOGY_TEST_CONSTANTS.ERROR_VALIDATION_FAILED));

      await expect(
        service.upsertArtifact(
          ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
          ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME,
          { mediaType: 'text/turtle', content: 'bad' }
        )
      ).rejects.toThrow(ONTOLOGY_TEST_CONSTANTS.ERROR_VALIDATION_FAILED);
    });

    it('should throw ValidationError without calling the API when mediaType is empty', async () => {
      await expect(
        service.upsertArtifact(
          ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
          ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME,
          { mediaType: '', content: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_OFN }
        )
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });
  });

  describe('uploadArtifacts', () => {
    it('should POST bulk artifacts as multipart/form-data and return metadata array', async () => {
      const artifacts = [
        createMockArtifactMetadata({ fileName: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME }),
        createMockArtifactMetadata({
          fileName: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME_2,
          type: ArtifactType.Constraints,
        }),
      ];
      mockApiClient.post.mockResolvedValue(artifacts);

      const result = await service.uploadArtifacts(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID, [
        {
          fileName: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME,
          type: ArtifactType.Schema,
          mediaType: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_MEDIA_TYPE_OFN,
          content: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_OFN,
        },
        {
          fileName: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME_2,
          type: ArtifactType.Constraints,
          mediaType: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_MEDIA_TYPE_TURTLE,
          content: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_SHACL,
        },
      ]);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        ONTOLOGY_ENDPOINTS.ARTIFACT.COLLECTION(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID),
        expect.any(FormData),
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(ONTOLOGY_TEST_CONSTANTS.ERROR_VALIDATION_FAILED));

      await expect(
        service.uploadArtifacts(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID, [])
      ).rejects.toThrow(ONTOLOGY_TEST_CONSTANTS.ERROR_VALIDATION_FAILED);
    });
  });

  describe('deleteArtifact', () => {
    it('should delete the artifact and return void', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await service.deleteArtifact(
        ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME
      );

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        ONTOLOGY_ENDPOINTS.ARTIFACT.BY_NAME(
          ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
          ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME
        ),
        expect.any(Object)
      );
    });

    it('should propagate 404 errors', async () => {
      mockApiClient.delete.mockRejectedValue(createMockError(ONTOLOGY_TEST_CONSTANTS.ERROR_NOT_FOUND));

      await expect(
        service.deleteArtifact(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID, ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME)
      ).rejects.toThrow(ONTOLOGY_TEST_CONSTANTS.ERROR_NOT_FOUND);
    });
  });

  describe('validateArtifact', () => {
    it('should POST raw content with Content-Type header and ?type= query param', async () => {
      mockApiClient.post.mockResolvedValue(createMockValidationResult());

      const result = await service.validateArtifact(
        ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME,
        {
          mediaType: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_MEDIA_TYPE_OFN,
          content: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_OFN,
          type: ArtifactType.Schema,
        }
      );

      const expectedUrl = `${ONTOLOGY_ENDPOINTS.ARTIFACT.VALIDATE(
        ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME
      )}?type=${encodeURIComponent(ArtifactType.Schema)}`;
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expectedUrl,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_OFN,
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': ONTOLOGY_TEST_CONSTANTS.ARTIFACT_MEDIA_TYPE_OFN }),
          bodyOptions: { stringify: false },
        })
      );
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should return invalid result with violations (200, not an error)', async () => {
      mockApiClient.post.mockResolvedValue(createMockValidationFailure());

      const result = await service.validateArtifact(
        ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME_2,
        { mediaType: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_MEDIA_TYPE_TURTLE, content: 'bad turtle' }
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].line).toBe(12);
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        service.validateArtifact(
          ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
          ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME,
          { mediaType: 'text/turtle', content: '' }
        )
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

    it('should throw ValidationError without calling the API when mediaType is empty', async () => {
      await expect(
        service.validateArtifact(
          ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
          ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME,
          { mediaType: '', content: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_SHACL }
        )
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('exportOntology', () => {
    it('should GET export endpoint with blob responseType and return Uint8Array', async () => {
      const zipContent = new Uint8Array([0x50, 0x4b, 0x05, 0x06]);
      const mockBlob = new Blob([zipContent], { type: 'application/zip' });
      mockApiClient.get.mockResolvedValue(mockBlob);

      const result = await service.exportOntology(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ONTOLOGY_ENDPOINTS.EXPORT(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID),
        expect.objectContaining({ responseType: 'blob' })
      );
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('should accept a name as idOrName', async () => {
      const mockBlob = new Blob([new Uint8Array([0x50, 0x4b])], { type: 'application/zip' });
      mockApiClient.get.mockResolvedValue(mockBlob);

      await service.exportOntology(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ONTOLOGY_ENDPOINTS.EXPORT(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME),
        expect.any(Object)
      );
    });

    it('should propagate 404 errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(ONTOLOGY_TEST_CONSTANTS.ERROR_NOT_FOUND));

      await expect(service.exportOntology(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID)).rejects.toThrow(
        ONTOLOGY_TEST_CONSTANTS.ERROR_NOT_FOUND
      );
    });
  });
});
