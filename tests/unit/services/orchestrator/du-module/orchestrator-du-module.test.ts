// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OrchestratorDuModuleService } from '@/services/orchestrator/du-module/orchestrator-du-module';
import { ApiClient } from '@/core/http/api-client';
import { ORCHESTRATOR_DU_MODULE_ENDPOINTS } from "@/utils/constants/endpoints";
import type {
  ProcessExtractedDataRequest,
  SubmitExceptionReportResponse,
} from '@/models/orchestrator/orchestrator-du-module.types';
import type { ExtractionResult } from '@/models/document-understanding/framework/results.types';
import { createMockError, TEST_CONSTANTS } from '@tests/utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '@tests/utils/setup';

// ===== MOCKING =====
vi.mock('@/core/http/api-client');

// ===== TEST CONSTANTS =====
const TASK_ID = 100548951;
const DOCUMENT_ID = '63c21fee-7d65-f111-8fcb-000d3aac42ce';
const REASON = 'Document is illegible';
const FOLDER_KEY = '00000000-0000-0000-0000-000000000001';

const EXPECTED_SUBMIT_BODY = {
  DocumentId: DOCUMENT_ID,
  Reason: REASON,
};

const SUBMIT_RESPONSE: SubmitExceptionReportResponse = {
  SubmitResult: { DocumentId: DOCUMENT_ID, Reason: REASON },
  IsSuccessful: true,
  ErrorMessage: '',
};

const EXTRACTION_RESULT: ExtractionResult = {
  DocumentId: DOCUMENT_ID,
  ResultsVersion: 1,
  ResultsDocument: {
    DocumentTypeId: 'invoice',
    DocumentTypeName: 'Invoice',
  },
};

const PROCESS_REQUEST: ProcessExtractedDataRequest = {
  AutomaticExtractedResults: EXTRACTION_RESULT,
  ValidatedExtractedResults: EXTRACTION_RESULT,
  Taxonomy: { DataContractVersion: '1.0' },
};

// ===== TEST SUITE =====
describe('OrchestratorDuModuleService Unit Tests', () => {
  let service: OrchestratorDuModuleService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    service = new OrchestratorDuModuleService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('submitExceptionReport', () => {
    it('should submit an exception report and return the server response', async () => {
      mockApiClient.post.mockResolvedValue(SUBMIT_RESPONSE);

      const result = await service.submitExceptionReport(TASK_ID, DOCUMENT_ID, REASON, { folderKey: FOLDER_KEY });

      expect(result).toEqual(SUBMIT_RESPONSE);
      expect(result.IsSuccessful).toBe(true);
      expect(result.SubmitResult?.DocumentId).toBe(DOCUMENT_ID);
      expect(result.SubmitResult?.Reason).toBe(REASON);
    });

    it('should call POST on the SubmitExceptionReport endpoint with taskId as a query param', async () => {
      mockApiClient.post.mockResolvedValue(SUBMIT_RESPONSE);

      await service.submitExceptionReport(TASK_ID, DOCUMENT_ID, REASON, { folderKey: FOLDER_KEY });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        ORCHESTRATOR_DU_MODULE_ENDPOINTS.SUBMIT_EXCEPTION_REPORT,
        EXPECTED_SUBMIT_BODY,
        expect.objectContaining({ params: { taskId: TASK_ID } }),
      );
    });

    it('should surface an unsuccessful submission via IsSuccessful=false', async () => {
      const failureResponse: SubmitExceptionReportResponse = {
        SubmitResult: { DocumentId: DOCUMENT_ID, Reason: REASON },
        IsSuccessful: false,
        ErrorMessage: 'Task is not in a state that accepts exceptions',
      };
      mockApiClient.post.mockResolvedValue(failureResponse);

      const result = await service.submitExceptionReport(TASK_ID, DOCUMENT_ID, REASON, { folderKey: FOLDER_KEY });

      expect(result.IsSuccessful).toBe(false);
      expect(result.ErrorMessage).toBe('Task is not in a state that accepts exceptions');
    });

    it('should propagate API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        service.submitExceptionReport(TASK_ID, DOCUMENT_ID, REASON, { folderKey: FOLDER_KEY }),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('processExtractedData', () => {
    it('should process extracted data and return the merged extraction result', async () => {
      mockApiClient.post.mockResolvedValue(EXTRACTION_RESULT);

      const result = await service.processExtractedData(PROCESS_REQUEST, { folderKey: FOLDER_KEY });

      expect(result).toEqual(EXTRACTION_RESULT);
      expect(result.DocumentId).toBe(DOCUMENT_ID);
      expect(result.ResultsDocument?.DocumentTypeName).toBe('Invoice');
    });

    it('should call POST on the ProcessExtractedData endpoint with the full payload', async () => {
      mockApiClient.post.mockResolvedValue(EXTRACTION_RESULT);

      await service.processExtractedData(PROCESS_REQUEST, { folderKey: FOLDER_KEY });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        ORCHESTRATOR_DU_MODULE_ENDPOINTS.PROCESS_EXTRACTED_DATA,
        PROCESS_REQUEST,
        expect.any(Object),
      );
    });

    it('should preserve PascalCase field names on the request payload (no transform)', async () => {
      mockApiClient.post.mockResolvedValue(EXTRACTION_RESULT);

      await service.processExtractedData(PROCESS_REQUEST, { folderKey: FOLDER_KEY });

      const [, sentBody] = mockApiClient.post.mock.calls[0];
      const body = sentBody as Record<string, unknown>;
      expect(body.AutomaticExtractedResults).toBeDefined();
      expect(body.ValidatedExtractedResults).toBeDefined();
      expect(body.Taxonomy).toBeDefined();
      expect(body.automaticExtractedResults).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(service.processExtractedData(PROCESS_REQUEST, { folderKey: FOLDER_KEY })).rejects.toThrow(
        TEST_CONSTANTS.ERROR_MESSAGE,
      );
    });
  });
});
