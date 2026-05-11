// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AttachmentService } from '../../../../src/services/orchestrator/attachments';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createMockRawAttachment } from '../../../utils/mocks/attachments';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { createMockError } from '../../../utils/mocks/core';
import { AttachmentGetByIdOptions } from '../../../../src/models/orchestrator/attachments.types';
import { ATTACHMENT_TEST_CONSTANTS } from '../../../utils/constants/attachments';
import { ORCHESTRATOR_ATTACHMENT_ENDPOINTS } from '../../../../src/utils/constants/endpoints';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

// ===== TEST SUITE =====
describe('AttachmentService Unit Tests', () => {
  let attachmentService: AttachmentService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

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

    it('should handle API errors', async () => {
      const error = createMockError(ATTACHMENT_TEST_CONSTANTS.ERROR_ATTACHMENT_NOT_FOUND);
      mockApiClient.get.mockRejectedValue(error);

      await expect(
        attachmentService.getById(ATTACHMENT_TEST_CONSTANTS.ATTACHMENT_ID)
      ).rejects.toThrow(ATTACHMENT_TEST_CONSTANTS.ERROR_ATTACHMENT_NOT_FOUND);
    });
  });
});
