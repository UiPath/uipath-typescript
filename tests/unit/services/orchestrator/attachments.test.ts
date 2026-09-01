// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AttachmentService } from '../../../../src/services/orchestrator/attachments';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createMockRawAttachment } from '../../../utils/mocks/attachments';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { createMockError } from '../../../utils/mocks/core';
import { AttachmentGetByIdOptions, JobAttachmentSchema } from '../../../../src/models/orchestrator/attachments.types';
import { ATTACHMENT_TEST_CONSTANTS } from '../../../utils/constants/attachments';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { ORCHESTRATOR_ATTACHMENT_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { FOLDER_ID } from '../../../../src/utils/constants/headers';
import { ValidationError, ServerError, AuthorizationError } from '../../../../src/core/errors';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

// ===== TEST SUITE =====
describe('AttachmentService Unit Tests', () => {
  let attachmentService: AttachmentService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });

    attachmentService = new AttachmentService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getById', () => {
    it('should get attachment by ID successfully with all fields mapped correctly', async () => {
      const mockAttachment = createMockRawAttachment();

      mockApiClient.get.mockResolvedValue(mockAttachment);

      const result = await attachmentService.getById(ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_ID);

      expect(result).toBeDefined();
      expect(result.id).toBe(ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_ID);
      expect(result.name).toBe(ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_NAME);
      expect(result.jobKey).toBe(ATTACHMENT_TEST_CONSTANTS.JOB_KEY);
      expect(result.attachmentCategory).toBe(ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_CATEGORY);

      // Verify the API call uses the correct endpoint
      expect(mockApiClient.get).toHaveBeenCalledWith(
        ORCHESTRATOR_ATTACHMENT_ENDPOINTS.GET_BY_ID(ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_ID),
        expect.objectContaining({
          params: expect.any(Object),
        })
      );

      // Verify transform: CreationTime -> createdTime
      expect(result.createdTime).toBe(ATTACHMENT_TEST_CONSTANTS.CREATED_TIME);
      expect((result as any).CreationTime).toBeUndefined();

      // Verify transform: LastModificationTime -> lastModifiedTime
      expect(result.lastModifiedTime).toBe(ATTACHMENT_TEST_CONSTANTS.LAST_MODIFIED_TIME);
      expect((result as any).LastModificationTime).toBeUndefined();
    });

    it('should get attachment with options (select) and apply OData prefix', async () => {
      const mockAttachment = createMockRawAttachment();
      mockApiClient.get.mockResolvedValue(mockAttachment);

      const options: AttachmentGetByIdOptions = {
        select: ATTACHMENT_TEST_CONSTANTS.ODATA_SELECT_FIELDS,
      };

      const result = await attachmentService.getById(ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_ID, options);

      expect(result).toBeDefined();
      expect(result.id).toBe(ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_ID);

      // Verify API call received OData-prefixed params
      expect(mockApiClient.get).toHaveBeenCalledWith(
        ORCHESTRATOR_ATTACHMENT_ENDPOINTS.GET_BY_ID(ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_ID),
        expect.objectContaining({
          params: expect.objectContaining({
            '$select': ATTACHMENT_TEST_CONSTANTS.ODATA_SELECT_FIELDS,
          }),
        })
      );
    });

    it('should include blobFileAccess in the response', async () => {
      const mockAttachment = createMockRawAttachment();
      mockApiClient.get.mockResolvedValue(mockAttachment);

      const result = await attachmentService.getById(ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_ID);

      expect(result.blobFileAccess).toBeDefined();
      expect(result.blobFileAccess.uri).toBe(ATTACHMENT_TEST_CONSTANTS.BLOB_URI);
      expect(result.blobFileAccess.httpMethod).toBe(ATTACHMENT_TEST_CONSTANTS.BLOB_HTTP_METHOD);
      expect(result.blobFileAccess.requiresAuth).toBe(false);
    });

    it('should throw ValidationError when id is empty string', async () => {
      await expect(attachmentService.getById('')).rejects.toThrow(
        ATTACHMENT_TEST_CONSTANTS.ERROR_ID_REQUIRED
      );

      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should accept a JobAttachmentSchema and resolve the attachment by its ID', async () => {
      const mockAttachment = createMockRawAttachment();
      mockApiClient.get.mockResolvedValue(mockAttachment);

      const jobAttachment: JobAttachmentSchema = {
        ID: ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_ID,
        FullName: ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_NAME,
        MimeType: 'application/pdf',
      };

      const result = await attachmentService.getById(jobAttachment);

      expect(result.id).toBe(ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_ID);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        ORCHESTRATOR_ATTACHMENT_ENDPOINTS.GET_BY_ID(ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_ID),
        expect.objectContaining({
          params: expect.any(Object),
        })
      );
    });

    it('should throw ValidationError when a JobAttachmentSchema has an empty ID', async () => {
      const jobAttachment: JobAttachmentSchema = {
        ID: '',
        FullName: ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_NAME,
        MimeType: 'application/pdf',
      };

      await expect(attachmentService.getById(jobAttachment)).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const error = createMockError(ATTACHMENT_TEST_CONSTANTS.ERROR_ATTACHMENT_NOT_FOUND);
      mockApiClient.get.mockRejectedValue(error);

      await expect(
        attachmentService.getById(ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_ID)
      ).rejects.toThrow(ATTACHMENT_TEST_CONSTANTS.ERROR_ATTACHMENT_NOT_FOUND);
    });

    it('should rewrite renamed SDK field names in select before calling the API', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawAttachment());

      await attachmentService.getById(
        ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_ID,
        { select: 'name,createdTime,lastModifiedTime' },
      );

      // createdTime → creationTime, lastModifiedTime → lastModificationTime.
      expect(mockApiClient.get).toHaveBeenCalledWith(
        ORCHESTRATOR_ATTACHMENT_ENDPOINTS.GET_BY_ID(ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_ID),
        expect.objectContaining({
          params: expect.objectContaining({
            '$select': 'name,creationTime,lastModificationTime',
          }),
        }),
      );
    });

    it('should rewrite both AttachmentsMap and BucketMap field names in OData strings', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawAttachment());

      await attachmentService.getById(
        ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_ID,
        { select: 'name,createdTime,blobFileAccess/path,blobFileAccess/httpMethod' },
      );

      // AttachmentsMap: createdTime → creationTime.
      // BucketMap (applied to nested blobFileAccess fields): path → fullPath, httpMethod → verb.
      expect(mockApiClient.get).toHaveBeenCalledWith(
        ORCHESTRATOR_ATTACHMENT_ENDPOINTS.GET_BY_ID(ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_ID),
        expect.objectContaining({
          params: expect.objectContaining({
            '$select': 'name,creationTime,blobFileAccess/fullPath,blobFileAccess/verb',
          }),
        }),
      );
    });
  });

  describe('create', () => {
    const uploadBody = new Blob([ATTACHMENT_TEST_CONSTANTS.UPLOAD_CONTENT]);
    let fetchMock: any;

    beforeEach(() => {
      fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 });
      vi.stubGlobal('fetch', fetchMock);
      mockApiClient.post.mockResolvedValue(createMockRawAttachment());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should create the attachment and upload its content', async () => {
      const result = await attachmentService.create(
        ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_NAME,
        uploadBody
      );

      expect(result.id).toBe(ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_ID);
      expect(result.name).toBe(ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_NAME);

      // The content is PUT to the URI returned by the create call
      expect(fetchMock).toHaveBeenCalledWith(
        ATTACHMENT_TEST_CONSTANTS.BLOB_URI,
        expect.objectContaining({
          method: 'PUT',
          body: uploadBody,
        })
      );
    });

    it('should send a PascalCase body to the OData endpoint', async () => {
      await attachmentService.create(
        ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_NAME,
        uploadBody
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        ORCHESTRATOR_ATTACHMENT_ENDPOINTS.CREATE,
        expect.objectContaining({ Name: ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_NAME }),
        expect.any(Object)
      );
    });

    it('should link to a job when jobKey is supplied', async () => {
      await attachmentService.create(
        ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_NAME,
        uploadBody,
        {
          jobKey: ATTACHMENT_TEST_CONSTANTS.JOB_KEY,
          category: ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_CATEGORY,
          folderId: TEST_CONSTANTS.FOLDER_ID,
        }
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        ORCHESTRATOR_ATTACHMENT_ENDPOINTS.CREATE,
        expect.objectContaining({
          Name: ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_NAME,
          JobKey: ATTACHMENT_TEST_CONSTANTS.JOB_KEY,
          AttachmentCategory: ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_CATEGORY,
        }),
        expect.objectContaining({
          headers: { [FOLDER_ID]: String(TEST_CONSTANTS.FOLDER_ID) },
        })
      );
    });

    it('should convert storage headers from key/value arrays before uploading', async () => {
      // Storage returns required headers as parallel arrays; sending them
      // unconverted drops x-ms-blob-type and the PUT is rejected.
      mockApiClient.post.mockResolvedValue(
        createMockRawAttachment({
          BlobFileAccess: {
            Uri: ATTACHMENT_TEST_CONSTANTS.BLOB_URI,
            Verb: 'PUT',
            RequiresAuth: false,
            Headers: { Keys: ['x-ms-blob-type'], Values: ['BlockBlob'] },
          },
        })
      );

      await attachmentService.create(
        ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_NAME,
        uploadBody
      );

      expect(fetchMock).toHaveBeenCalledWith(
        ATTACHMENT_TEST_CONSTANTS.BLOB_URI,
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-ms-blob-type': 'BlockBlob' }),
        })
      );
    });

    it('should not send a folder header when no folderId is supplied', async () => {
      await attachmentService.create(ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_NAME, uploadBody);

      // The attachment then lands in the tenant's default folder. Sending the
      // header with an undefined value would target a folder that doesn't exist.
      const [, , config] = mockApiClient.post.mock.calls[0];
      expect(config.headers).not.toHaveProperty(FOLDER_ID);
    });

    it('should not expose the upload URI on the response', async () => {
      const result = await attachmentService.create(
        ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_NAME,
        uploadBody
      );

      // The write URI is a short-lived credential and must not leak to callers
      expect((result as any).blobFileAccess).toBeUndefined();
    });

    it('should not leak OData transport metadata on the response', async () => {
      mockApiClient.post.mockResolvedValue(
        createMockRawAttachment({ '@odata.context': 'https://tenant/odata/$metadata#Attachments/$entity' })
      );

      const result = await attachmentService.create(
        ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_NAME,
        uploadBody
      );

      expect((result as any)['@odata.context']).toBeUndefined();
    });

    it('should apply the transform pipeline to the created attachment', async () => {
      const result = await attachmentService.create(
        ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_NAME,
        uploadBody
      );

      expect(result.createdTime).toBe(ATTACHMENT_TEST_CONSTANTS.CREATED_TIME);
      expect((result as any).CreationTime).toBeUndefined();
      expect(result.lastModifiedTime).toBe(ATTACHMENT_TEST_CONSTANTS.LAST_MODIFIED_TIME);
      expect((result as any).LastModificationTime).toBeUndefined();
    });

    it('should throw ValidationError when name is empty string', async () => {
      await expect(
        attachmentService.create('', uploadBody)
      ).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when content is missing', async () => {
      await expect(
        attachmentService.create(ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_NAME, undefined as any)
      ).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ServerError when the create response has no upload URI', async () => {
      mockApiClient.post.mockResolvedValue(
        createMockRawAttachment({ BlobFileAccess: { Uri: undefined } })
      );

      await expect(
        attachmentService.create(
          ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_NAME,
          uploadBody
        )
      ).rejects.toBeInstanceOf(ServerError);

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should throw when the content upload fails', async () => {
      // Real Response — the parser reads the body via clone(), which a plain
      // object literal cannot model, so a stub would route to the fallback path
      // and never exercise parsing.
      fetchMock.mockResolvedValue(
        new Response(ATTACHMENT_TEST_CONSTANTS.XML_UPLOAD_ERROR_BODY, {
          status: 403,
          statusText: ATTACHMENT_TEST_CONSTANTS.ERROR_UPLOAD_FAILED,
          headers: { 'content-type': 'application/xml' },
        })
      );

      const error = await attachmentService
        .create(ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_NAME, uploadBody)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AuthorizationError);
      // Storage's own body reaches the caller, so a failed upload is diagnosable
      expect((error as AuthorizationError).message).toBe(
        ATTACHMENT_TEST_CONSTANTS.ERROR_UPLOAD_FAILED
      );
    });

    it('should handle API errors from the create call', async () => {
      const error = createMockError(ATTACHMENT_TEST_CONSTANTS.ERROR_ATTACHMENT_NOT_FOUND);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        attachmentService.create(
          ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_NAME,
          uploadBody
        )
      ).rejects.toThrow(ATTACHMENT_TEST_CONSTANTS.ERROR_ATTACHMENT_NOT_FOUND);
    });
  });
});
