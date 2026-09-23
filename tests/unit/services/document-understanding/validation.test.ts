// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DuValidationService } from '@/services/document-understanding/validation';
import { ApiClient } from '@/core/http/api-client';
import { DU_VALIDATION_ENDPOINTS } from '@/utils/constants/endpoints';
import type { DuValidationStartRequest } from '@/models/document-understanding/validation.types';
import { ActionStatus } from '@/models/document-understanding/framework/validation.types';
import { ErrorSeverity } from '@/models/document-understanding/framework/helpers.types';
import { JobStatus } from '@/models/document-understanding/framework/model.types';
import { ValidationError } from '@/core/errors';
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
const RESULT_URL = `result/${OPERATION_ID}`;

const START_REQUEST: DuValidationStartRequest = {
  documentId: DOCUMENT_ID,
  actionTitle: 'Review invoice',
  extractionResult: {
    DocumentId: DOCUMENT_ID,
    ResultsDocument: { DocumentTypeId: 'invoice' },
  },
};

const START_WIRE_BODY = {
  DocumentId: DOCUMENT_ID,
  ActionTitle: 'Review invoice',
  ExtractionResult: {
    DocumentId: DOCUMENT_ID,
    ResultsDocument: { DocumentTypeId: 'invoice' },
  },
};

const START_API_RESPONSE = {
  OperationId: OPERATION_ID,
  ResultUrl: RESULT_URL,
};

const START_SDK_RESPONSE = {
  operationId: OPERATION_ID,
  resultUrl: RESULT_URL,
};

const CREATED_TIME = '2026-01-01T00:00:00Z';
const LAST_MODIFIED_TIME = '2026-01-02T00:00:00Z';

const RESULT_API_RESPONSE = {
  Status: JobStatus.Succeeded,
  CreatedAt: CREATED_TIME,
  LastUpdatedAt: LAST_MODIFIED_TIME,
  Error: {
    Message: 'validation failed',
    Severity: ErrorSeverity.Error,
    Code: 'E1',
    Parameters: ['total'],
  },
  Result: {
    ActionStatus: ActionStatus.Pending,
    ActionData: { Title: 'Review invoice', TaskUrl: 'https://example.test/task' },
    ValidatedExtractionResults: {
      DocumentId: DOCUMENT_ID,
      ResultsDocument: { DocumentTypeId: 'invoice' },
    },
    DataProjection: [{ FieldGroupName: 'header', FieldValues: [{ Name: 'Total' }] }],
  },
};

const RESULT_SDK_RESPONSE = {
  status: JobStatus.Succeeded,
  createdTime: CREATED_TIME,
  lastModifiedTime: LAST_MODIFIED_TIME,
  error: {
    message: 'validation failed',
    severity: ErrorSeverity.Error,
    code: 'E1',
    parameters: ['total'],
  },
  result: {
    actionStatus: ActionStatus.Pending,
    actionData: { Title: 'Review invoice', TaskUrl: 'https://example.test/task' },
    validatedExtractionResults: {
      DocumentId: DOCUMENT_ID,
      ResultsDocument: { DocumentTypeId: 'invoice' },
    },
    dataProjection: [{ FieldGroupName: 'header', FieldValues: [{ Name: 'Total' }] }],
  },
};

// ===== TEST SUITE =====
describe('DuValidationService Unit Tests', () => {
  let service: DuValidationService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient as ApiClient; });

    service = new DuValidationService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('startExtractionValidation', () => {
    it('should start a validation action and return the operation id', async () => {
      mockApiClient.post.mockResolvedValue(START_API_RESPONSE);

      const result = await service.startExtractionValidation(PROJECT_ID, TAG, DOCUMENT_TYPE_ID, START_REQUEST);

      expect(result).toEqual(START_SDK_RESPONSE);
      expect(result.operationId).toBe(OPERATION_ID);
      expect(result.resultUrl).toBe(RESULT_URL);
      expect((result as Record<string, unknown>).OperationId).toBeUndefined();
      expect((result as Record<string, unknown>).ResultUrl).toBeUndefined();
    });

    it('should POST to the validation start endpoint with api-version 1.1', async () => {
      mockApiClient.post.mockResolvedValue(START_API_RESPONSE);

      await service.startExtractionValidation(PROJECT_ID, TAG, DOCUMENT_TYPE_ID, START_REQUEST);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        DU_VALIDATION_ENDPOINTS.START(PROJECT_ID, TAG, DOCUMENT_TYPE_ID),
        START_WIRE_BODY,
        expect.objectContaining({ params: { 'api-version': '1.1' } }),
      );
    });

    it('should honor an apiVersion override', async () => {
      mockApiClient.post.mockResolvedValue(START_API_RESPONSE);

      await service.startExtractionValidation(PROJECT_ID, TAG, DOCUMENT_TYPE_ID, START_REQUEST, {
        apiVersion: '2.0',
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        START_WIRE_BODY,
        expect.objectContaining({ params: { 'api-version': '2.0' } }),
      );
    });

    it('should reject a missing projectId', async () => {
      await expect(service.startExtractionValidation('', TAG, DOCUMENT_TYPE_ID, START_REQUEST)).rejects.toBeInstanceOf(
        ValidationError,
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
      mockApiClient.get.mockResolvedValue(RESULT_API_RESPONSE);

      const result = await service.getExtractionValidationResult(PROJECT_ID, TAG, DOCUMENT_TYPE_ID, OPERATION_ID);

      expect(result).toEqual(RESULT_SDK_RESPONSE);
      expect(result.status).toBe(JobStatus.Succeeded);
      expect(result.createdTime).toBe(CREATED_TIME);
      expect(result.lastModifiedTime).toBe(LAST_MODIFIED_TIME);
      expect(result.result?.actionStatus).toBe(ActionStatus.Pending);
      expect(result.result?.validatedExtractionResults?.DocumentId).toBe(DOCUMENT_ID);
      expect(result.result?.validatedExtractionResults?.ResultsDocument?.DocumentTypeId).toBe('invoice');
      expect(result.result?.actionData?.Title).toBe('Review invoice');
      expect(result.result?.dataProjection?.[0]?.FieldGroupName).toBe('header');
      expect(result.result?.dataProjection?.[0]?.FieldValues?.[0]?.Name).toBe('Total');
      expect(result.error?.message).toBe('validation failed');
      expect(result.result?.validatedExtractionResults).not.toHaveProperty('documentId');
      expect(result.result?.actionData).not.toHaveProperty('title');
      expect(result.result?.dataProjection?.[0]).not.toHaveProperty('fieldGroupName');
      expect(result.result).not.toHaveProperty('ActionStatus');
      expect(result.error).not.toHaveProperty('Message');
      expect((result as Record<string, unknown>).Status).toBeUndefined();
      expect((result as Record<string, unknown>).createdAt).toBeUndefined();
      expect((result as Record<string, unknown>).lastUpdatedAt).toBeUndefined();
      expect((result as Record<string, unknown>).Result).toBeUndefined();
    });

    it('should GET the validation result endpoint with api-version 1.1', async () => {
      mockApiClient.get.mockResolvedValue(RESULT_API_RESPONSE);

      await service.getExtractionValidationResult(PROJECT_ID, TAG, DOCUMENT_TYPE_ID, OPERATION_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        DU_VALIDATION_ENDPOINTS.GET_RESULT(PROJECT_ID, TAG, DOCUMENT_TYPE_ID, OPERATION_ID),
        expect.objectContaining({ params: { 'api-version': '1.1' } }),
      );
    });

    it('should reject a missing operationId', async () => {
      await expect(service.getExtractionValidationResult(PROJECT_ID, TAG, DOCUMENT_TYPE_ID, '')).rejects.toBeInstanceOf(
        ValidationError,
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
