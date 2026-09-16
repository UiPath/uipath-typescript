// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DuValidationService } from '@/services/document-understanding/validation';
import { ApiClient } from '@/core/http/api-client';
import { DU_VALIDATION_ENDPOINTS } from '@/utils/constants/endpoints';
import type {
  GetExtractionValidationTaskResponse,
  StartExtractionValidationTaskRequestV2_0,
  StartValidationTaskResponse,
} from '@/models/document-understanding/framework/validation.types';
import { ActionStatus } from '@/models/document-understanding/framework/validation.types';
import { JobStatus } from '@/models/document-understanding/framework/model.types';
import { createMockError, TEST_CONSTANTS } from '@tests/utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '@tests/utils/setup';

// ===== MOCKING =====
vi.mock('@/core/http/api-client');

// ===== TEST CONSTANTS =====
const PROJECT_ID = 'proj-123';
const TAG = 'v1';
const DOCUMENT_TYPE_ID = '00000000-0000-0000-0000-000000000000';
const OPERATION_ID = 'op-456';
const DOCUMENT_ID = '63c21fee-7d65-f111-8fcb-000d3aac42ce';

const START_REQUEST: StartExtractionValidationTaskRequestV2_0 = {
  DocumentId: DOCUMENT_ID,
  ActionTitle: 'Review invoice',
  ExtractionResult: { DocumentId: DOCUMENT_ID },
};

const START_RESPONSE: StartValidationTaskResponse = {
  OperationId: OPERATION_ID,
  ResultUrl: `result/${OPERATION_ID}`,
};

const RESULT_RESPONSE: GetExtractionValidationTaskResponse = {
  Status: JobStatus.Succeeded,
  Result: { ActionStatus: ActionStatus.Pending },
};

// ===== TEST SUITE =====
describe('DuValidationService Unit Tests', () => {
  let service: DuValidationService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });

    service = new DuValidationService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('startExtractionValidation', () => {
    it('should start a validation action and return the operation id', async () => {
      mockApiClient.post.mockResolvedValue(START_RESPONSE);

      const result = await service.startExtractionValidation(PROJECT_ID, TAG, DOCUMENT_TYPE_ID, START_REQUEST);

      expect(result).toEqual(START_RESPONSE);
      expect(result.OperationId).toBe(OPERATION_ID);
    });

    it('should POST to the validation start endpoint with api-version 1.1', async () => {
      mockApiClient.post.mockResolvedValue(START_RESPONSE);

      await service.startExtractionValidation(PROJECT_ID, TAG, DOCUMENT_TYPE_ID, START_REQUEST);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DU_VALIDATION_ENDPOINTS.START(PROJECT_ID, TAG, DOCUMENT_TYPE_ID),
        START_REQUEST,
        expect.objectContaining({ params: { 'api-version': '1.1' } }),
      );
    });

    it('should honor an apiVersion override', async () => {
      mockApiClient.post.mockResolvedValue(START_RESPONSE);

      await service.startExtractionValidation(PROJECT_ID, TAG, DOCUMENT_TYPE_ID, START_REQUEST, {
        apiVersion: '2.0',
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        START_REQUEST,
        expect.objectContaining({ params: { 'api-version': '2.0' } }),
      );
    });

    it('should reject a missing projectId', async () => {
      await expect(service.startExtractionValidation('', TAG, DOCUMENT_TYPE_ID, START_REQUEST)).rejects.toThrow(
        'projectId is required',
      );
    });

    it('should propagate API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        service.startExtractionValidation(PROJECT_ID, TAG, DOCUMENT_TYPE_ID, START_REQUEST),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getExtractionValidationResult', () => {
    it('should return the validation operation snapshot', async () => {
      mockApiClient.get.mockResolvedValue(RESULT_RESPONSE);

      const result = await service.getExtractionValidationResult(PROJECT_ID, TAG, DOCUMENT_TYPE_ID, OPERATION_ID);

      expect(result).toEqual(RESULT_RESPONSE);
      expect(result.Status).toBe(JobStatus.Succeeded);
    });

    it('should GET the validation result endpoint with api-version 1.1', async () => {
      mockApiClient.get.mockResolvedValue(RESULT_RESPONSE);

      await service.getExtractionValidationResult(PROJECT_ID, TAG, DOCUMENT_TYPE_ID, OPERATION_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        DU_VALIDATION_ENDPOINTS.GET_RESULT(PROJECT_ID, TAG, DOCUMENT_TYPE_ID, OPERATION_ID),
        expect.objectContaining({ params: { 'api-version': '1.1' } }),
      );
    });

    it('should reject a missing operationId', async () => {
      await expect(service.getExtractionValidationResult(PROJECT_ID, TAG, DOCUMENT_TYPE_ID, '')).rejects.toThrow(
        'operationId is required',
      );
    });

    it('should propagate API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(
        service.getExtractionValidationResult(PROJECT_ID, TAG, DOCUMENT_TYPE_ID, OPERATION_ID),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
