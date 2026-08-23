// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TaskCatalogService } from '../../../../src/services/action-center/task-catalogs';
import { ApiClient } from '../../../../src/core/http/api-client';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { createMockBaseResponse, createMockCollection, createMockError } from '../../../utils/mocks/core';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { TASK_CATALOG_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { FOLDER_ID, FOLDER_KEY, FOLDER_PATH_ENCODED } from '../../../../src/utils/constants/headers';
import { ValidationError, NotFoundError } from '../../../../src/core/errors';
import { TaskCatalogRetentionAction } from '../../../../src/models/action-center/task-catalogs.types';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

const mocks = vi.hoisted(() => {
  return import('../../../utils/mocks/core');
});

vi.mock('../../../../src/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

// ===== TEST FIXTURES =====
const CATALOG = {
  ID: 42,
  KEY: '11111111-1111-1111-1111-111111111111',
  NAME: 'Invoices',
  DESCRIPTION: 'Invoice approval tasks',
  CREATED_TIME: '2026-01-01T00:00:00.000Z',
  LAST_MODIFIED_TIME: '2026-02-01T00:00:00.000Z',
};

const createMockRawCatalog = (overrides: Partial<any> = {}): any =>
  createMockBaseResponse({
    Id: CATALOG.ID,
    Key: CATALOG.KEY,
    Name: CATALOG.NAME,
    Description: CATALOG.DESCRIPTION,
    Encrypted: false,
    Tags: [],
    FoldersCount: 1,
    RetentionAction: TaskCatalogRetentionAction.Archive,
    RetentionPeriod: 30,
    RetentionBucketId: 7,
    RetentionBucketName: 'archive-bucket',
    CreationTime: CATALOG.CREATED_TIME,
    LastModificationTime: CATALOG.LAST_MODIFIED_TIME,
  }, overrides);

const createMockCatalogCollection = (count = 1, options?: { totalCount?: number; hasNextPage?: boolean; nextCursor?: string }): any => {
  const items = createMockCollection(count, (index) => ({
    id: CATALOG.ID + index,
    key: `${index}-${CATALOG.KEY}`,
    name: `${CATALOG.NAME}${index + 1}`,
    createdTime: CATALOG.CREATED_TIME,
    lastModifiedTime: CATALOG.LAST_MODIFIED_TIME,
  }));
  return createMockBaseResponse({
    items,
    totalCount: options?.totalCount ?? count,
    ...(options?.hasNextPage !== undefined && { hasNextPage: options.hasNextPage }),
    ...(options?.nextCursor && { nextCursor: options.nextCursor }),
  });
};

// ===== TEST SUITE =====
describe('TaskCatalogService', () => {
  let service: TaskCatalogService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });
    vi.mocked(PaginationHelpers.getAll).mockReset();
    service = new TaskCatalogService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should throw ValidationError when no folder is provided', async () => {
      await expect(service.getAll()).rejects.toBeInstanceOf(ValidationError);
      expect(PaginationHelpers.getAll).not.toHaveBeenCalled();
    });

    it('should list catalogs for a folder (folderId routed to org-unit header)', async () => {
      const mockResponse = createMockCatalogCollection();
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await service.getAll({ folderId: TEST_CONSTANTS.FOLDER_ID });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.toSatisfy((fn: Function) => fn() === TASK_CATALOG_ENDPOINTS.GET_ALL),
          headers: expect.objectContaining({ [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString() }),
          transformFn: expect.any(Function),
          pagination: expect.any(Object),
        }),
        // folder fields are stripped out of the paged options and routed to headers
        expect.not.objectContaining({ folderId: TEST_CONSTANTS.FOLDER_ID }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should route folderKey to the folder-key header', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(createMockCatalogCollection());

      await service.getAll({ folderKey: 'my-folder-key' });

      const [[config]] = vi.mocked(PaginationHelpers.getAll).mock.calls;
      expect(config.headers).toMatchObject({ [FOLDER_KEY]: 'my-folder-key' });
      expect(config.headers[FOLDER_ID]).toBeUndefined();
    });

    it('should route folderPath to the encoded folder-path header', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(createMockCatalogCollection());

      await service.getAll({ folderPath: 'Shared' });

      const [[config]] = vi.mocked(PaginationHelpers.getAll).mock.calls;
      expect(config.headers[FOLDER_PATH_ENCODED]).toBeDefined();
      expect(config.headers[FOLDER_ID]).toBeUndefined();
    });

    it('should forward pagination options without leaking folder fields', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(createMockCatalogCollection(10));

      await service.getAll({ folderId: TEST_CONSTANTS.FOLDER_ID, pageSize: TEST_CONSTANTS.PAGE_SIZE });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ pageSize: TEST_CONSTANTS.PAGE_SIZE }),
      );
      const [[, paged]] = vi.mocked(PaginationHelpers.getAll).mock.calls;
      expect((paged as any).folderId).toBeUndefined();
    });

    it('should transform items returned by getAll (camelCase, no PascalCase leaks)', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(createMockCatalogCollection());
      await service.getAll({ folderId: TEST_CONSTANTS.FOLDER_ID });

      const [[config]] = vi.mocked(PaginationHelpers.getAll).mock.calls;
      const result = config.transformFn(createMockRawCatalog());

      expect(result.createdTime).toBe(CATALOG.CREATED_TIME);
      expect((result as any).CreationTime).toBeUndefined();
      expect(result.lastModifiedTime).toBe(CATALOG.LAST_MODIFIED_TIME);
      expect((result as any).LastModificationTime).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
      await expect(service.getAll({ folderId: TEST_CONSTANTS.FOLDER_ID })).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getById', () => {
    it('should throw ValidationError when no folder is provided', async () => {
      await expect(service.getById(CATALOG.ID)).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should get a catalog and transform its fields', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawCatalog());

      const result = await service.getById(CATALOG.ID, { folderId: TEST_CONSTANTS.FOLDER_ID });

      expect(result.id).toBe(CATALOG.ID);
      expect(result.name).toBe(CATALOG.NAME);
      expect(result.retentionAction).toBe(TaskCatalogRetentionAction.Archive);
      expect(result.createdTime).toBe(CATALOG.CREATED_TIME);
      expect((result as any).CreationTime).toBeUndefined();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        TASK_CATALOG_ENDPOINTS.GET_BY_ID(CATALOG.ID),
        expect.objectContaining({
          headers: expect.objectContaining({ [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString() }),
        }),
      );
    });

    it('should OData-prefix query options and not leak folder fields into params', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawCatalog());

      await service.getById(CATALOG.ID, { folderId: TEST_CONSTANTS.FOLDER_ID, expand: 'Tags', select: 'name,description' });

      const [, requestSpec] = mockApiClient.get.mock.calls[0];
      expect(requestSpec.params).toMatchObject({ '$expand': 'Tags', '$select': 'name,description' });
      expect(requestSpec.params.folderId).toBeUndefined();
      expect(requestSpec.params['$folderId']).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
      await expect(service.getById(CATALOG.ID, { folderId: TEST_CONSTANTS.FOLDER_ID })).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getByName', () => {
    it('should resolve a catalog by name via an OData name filter and transform it', async () => {
      mockApiClient.get.mockResolvedValue({ value: [createMockRawCatalog()] });

      const result = await service.getByName(CATALOG.NAME, { folderId: TEST_CONSTANTS.FOLDER_ID });

      expect(result.id).toBe(CATALOG.ID);
      expect(result.name).toBe(CATALOG.NAME);
      expect(result.createdTime).toBe(CATALOG.CREATED_TIME);
      expect((result as any).CreationTime).toBeUndefined();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        TASK_CATALOG_ENDPOINTS.GET_ALL,
        expect.objectContaining({
          headers: expect.objectContaining({ [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString() }),
          params: expect.objectContaining({ '$filter': `Name eq '${CATALOG.NAME}'`, '$top': '1' }),
        }),
      );
    });

    it('should throw ValidationError when no folder is provided', async () => {
      await expect(service.getByName(CATALOG.NAME)).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when name is empty', async () => {
      await expect(service.getByName('', { folderId: TEST_CONSTANTS.FOLDER_ID })).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when no catalog matches the name', async () => {
      mockApiClient.get.mockResolvedValue({ value: [] });
      await expect(service.getByName('does-not-exist', { folderId: TEST_CONSTANTS.FOLDER_ID })).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('create', () => {
    it('should throw ValidationError when name is empty', async () => {
      await expect(service.create('', { folderId: TEST_CONSTANTS.FOLDER_ID })).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when no folder is provided', async () => {
      await expect(service.create(CATALOG.NAME)).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should POST a PascalCase body to the create action and transform the response', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawCatalog());

      const result = await service.create(
        CATALOG.NAME,
        { description: CATALOG.DESCRIPTION, encrypted: false, folderId: TEST_CONSTANTS.FOLDER_ID },
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        TASK_CATALOG_ENDPOINTS.CREATE,
        expect.objectContaining({ Name: CATALOG.NAME, Description: CATALOG.DESCRIPTION, Encrypted: false }),
        expect.objectContaining({
          headers: expect.objectContaining({ [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString() }),
        }),
      );
      // folder fields must not leak into the request body
      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.FolderId).toBeUndefined();

      expect(result.id).toBe(CATALOG.ID);
      expect((result as any).CreationTime).toBeUndefined();
    });

    it('should not leak expand/select into the request body', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawCatalog());
      await service.create(CATALOG.NAME, { folderId: TEST_CONSTANTS.FOLDER_ID, expand: 'Tags', select: 'name' });
      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.Expand).toBeUndefined();
      expect(body.Select).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
      await expect(service.create(CATALOG.NAME, { folderId: TEST_CONSTANTS.FOLDER_ID })).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('updateById', () => {
    it('should throw ValidationError when no folder is provided', async () => {
      await expect(service.updateById(CATALOG.ID)).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when id is empty', async () => {
      await expect(service.updateById(0, { folderId: TEST_CONSTANTS.FOLDER_ID })).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should read the current catalog then POST a PascalCase body and resolve void', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawCatalog());
      mockApiClient.post.mockResolvedValue(createMockBaseResponse({}));

      const result = await service.updateById(
        CATALOG.ID,
        { description: 'Updated', folderId: TEST_CONSTANTS.FOLDER_ID },
      );

      expect(result).toBeUndefined();
      // Reads the current catalog first (read-modify-write).
      expect(mockApiClient.get).toHaveBeenCalledWith(
        TASK_CATALOG_ENDPOINTS.GET_BY_ID(CATALOG.ID),
        expect.any(Object),
      );
      // Name defaults to the current catalog's name when not overridden.
      expect(mockApiClient.post).toHaveBeenCalledWith(
        TASK_CATALOG_ENDPOINTS.UPDATE(CATALOG.ID),
        expect.objectContaining({ Name: CATALOG.NAME, Description: 'Updated' }),
        expect.objectContaining({
          headers: expect.objectContaining({ [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString() }),
        }),
      );
    });

    it('should rename the catalog when a new name is passed in options', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawCatalog());
      mockApiClient.post.mockResolvedValue(createMockBaseResponse({}));

      await service.updateById(CATALOG.ID, { name: 'Renamed', folderId: TEST_CONSTANTS.FOLDER_ID });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.Name).toBe('Renamed');
    });

    it('should preserve fields not passed by merging over the current catalog', async () => {
      // Current catalog has retention; caller updates only the description.
      mockApiClient.get.mockResolvedValue(createMockRawCatalog());
      mockApiClient.post.mockResolvedValue(createMockBaseResponse({}));

      await service.updateById(CATALOG.ID, { description: 'Only desc', folderId: TEST_CONSTANTS.FOLDER_ID });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.Description).toBe('Only desc');
      // Unspecified fields come from the current catalog, not wiped.
      expect(body.Name).toBe(CATALOG.NAME);
      expect(body.Encrypted).toBe(false); // always the current value; update cannot change it
      expect(body.RetentionAction).toBe(TaskCatalogRetentionAction.Archive);
      expect(body.RetentionPeriod).toBe(30);
      // Tags are omitted when not passed (the catalog GET does not return them to preserve).
      expect(body.Tags).toBeUndefined();
    });

    it('should send null instead of the None sentinel when the catalog has no retention', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawCatalog({ RetentionAction: TaskCatalogRetentionAction.None, RetentionPeriod: null }));
      mockApiClient.post.mockResolvedValue(createMockBaseResponse({}));

      await service.updateById(CATALOG.ID, { description: 'x', folderId: TEST_CONSTANTS.FOLDER_ID });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.RetentionAction).toBeNull();
    });

    it('should send tags only when the caller passes them', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawCatalog());
      mockApiClient.post.mockResolvedValue(createMockBaseResponse({}));

      await service.updateById(CATALOG.ID, { tags: [{ name: 'urgent', displayName: 'Urgent', displayValue: 'yes' }], folderId: TEST_CONSTANTS.FOLDER_ID });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.Tags).toEqual([{ Name: 'urgent', DisplayName: 'Urgent', DisplayValue: 'yes' }]);
    });

    it('should not leak expand/select into the request body', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawCatalog());
      mockApiClient.post.mockResolvedValue(createMockBaseResponse({}));
      await service.updateById(CATALOG.ID, { folderId: TEST_CONSTANTS.FOLDER_ID, expand: 'Tags', select: 'name' });
      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.Expand).toBeUndefined();
      expect(body.Select).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawCatalog());
      mockApiClient.post.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
      await expect(service.updateById(CATALOG.ID, { folderId: TEST_CONSTANTS.FOLDER_ID })).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('updateByName', () => {
    it('should throw ValidationError when no folder is provided', async () => {
      await expect(service.updateByName(CATALOG.NAME)).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when name is empty', async () => {
      await expect(service.updateByName('', { folderId: TEST_CONSTANTS.FOLDER_ID })).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should resolve the id by name then POST the update, renaming via options', async () => {
      // First call resolves the name -> catalog; second call is the update POST.
      mockApiClient.get.mockResolvedValue({ value: [createMockRawCatalog()] });
      mockApiClient.post.mockResolvedValue(createMockBaseResponse({}));

      await service.updateByName(CATALOG.NAME, { name: 'Renamed', description: 'Updated', folderId: TEST_CONSTANTS.FOLDER_ID });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        TASK_CATALOG_ENDPOINTS.GET_ALL,
        expect.objectContaining({
          params: expect.objectContaining({ '$filter': `Name eq '${CATALOG.NAME}'`, '$top': '1' }),
        }),
      );
      expect(mockApiClient.post).toHaveBeenCalledWith(
        TASK_CATALOG_ENDPOINTS.UPDATE(CATALOG.ID),
        expect.objectContaining({ Name: 'Renamed', Description: 'Updated' }),
        expect.any(Object),
      );
    });

    it('should preserve fields not passed by merging over the current catalog', async () => {
      // The name lookup returns the current catalog; caller updates only the description.
      mockApiClient.get.mockResolvedValue({ value: [createMockRawCatalog()] });
      mockApiClient.post.mockResolvedValue(createMockBaseResponse({}));

      await service.updateByName(CATALOG.NAME, { description: 'Only desc', folderId: TEST_CONSTANTS.FOLDER_ID });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.Description).toBe('Only desc');
      // Name preserved (not renamed) since options.name was omitted.
      expect(body.Name).toBe(CATALOG.NAME);
      expect(body.RetentionAction).toBe(TaskCatalogRetentionAction.Archive);
      expect(body.RetentionPeriod).toBe(30);
      // Tags omitted when not passed.
      expect(body.Tags).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockResolvedValue({ value: [createMockRawCatalog()] });
      mockApiClient.post.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));
      await expect(service.updateByName(CATALOG.NAME, { folderId: TEST_CONSTANTS.FOLDER_ID })).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
