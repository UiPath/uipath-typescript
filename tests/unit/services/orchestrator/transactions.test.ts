// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TransactionService } from '../../../../src/services/orchestrator/transactions';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createMockRawQueueItem } from '../../../utils/mocks/queues';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { createMockError } from '../../../utils/mocks/core';
import { QUEUE_TEST_CONSTANTS } from '../../../utils/constants/queues';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { QUEUE_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { FOLDER_ID } from '../../../../src/utils/constants/headers';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

// ===== TEST SUITE =====
describe('TransactionService Unit Tests', () => {
  let transactionService: TransactionService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    transactionService = new TransactionService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('startTransaction', () => {
    it('should start a transaction and map organizationUnitId to folderId', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawQueueItem());

      const result = await transactionService.startTransaction(
        TEST_CONSTANTS.FOLDER_ID,
        QUEUE_TEST_CONSTANTS.QUEUE_NAME,
        QUEUE_TEST_CONSTANTS.ROBOT_IDENTIFIER
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID);
      expect(result.queueDefinitionId).toBe(QUEUE_TEST_CONSTANTS.QUEUE_DEFINITION_ID);
      expect(result.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect((result as any).organizationUnitId).toBeUndefined();

      expect(mockApiClient.post).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.START_TRANSACTION,
        expect.objectContaining({
          transactionData: expect.objectContaining({
            Name: QUEUE_TEST_CONSTANTS.QUEUE_NAME,
            RobotIdentifier: QUEUE_TEST_CONSTANTS.ROBOT_IDENTIFIER
          })
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(transactionService.startTransaction(
        TEST_CONSTANTS.FOLDER_ID,
        QUEUE_TEST_CONSTANTS.QUEUE_NAME
      )).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('setTransactionResult', () => {
    it('should set a transaction result with expected payload', async () => {
      mockApiClient.post.mockResolvedValue(undefined);

      const transactionResult = {
        IsSuccessful: true,
        Output: { completed: true }
      };

      await transactionService.setTransactionResult(
        TEST_CONSTANTS.FOLDER_ID,
        QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID,
        transactionResult
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.SET_TRANSACTION_RESULT(QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID),
        expect.objectContaining({
          transactionResult
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(transactionService.setTransactionResult(
        TEST_CONSTANTS.FOLDER_ID,
        QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID,
        { IsSuccessful: false, ProcessingException: { Reason: 'ValidationError' } }
      )).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
