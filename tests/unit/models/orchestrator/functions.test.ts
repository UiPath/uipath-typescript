// ===== IMPORTS =====
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createFunctionWithMethods, FunctionServiceModel } from '../../../../src/models/orchestrator/functions.models';
import { createBasicFunction } from '../../../utils/mocks/functions';
import { FUNCTION_TEST_CONSTANTS } from '../../../utils/constants/functions';
import { TEST_CONSTANTS } from '../../../utils/constants/common';

// ===== TEST SUITE =====
describe('Function Models Unit Tests', () => {
  let mockService: FunctionServiceModel;

  beforeEach(() => {
    mockService = {
      getAll: vi.fn(),
      invoke: vi.fn(),
    };
  });

  describe('createFunctionWithMethods', () => {
    it('should merge raw data with bound methods', () => {
      const functionData = createBasicFunction();

      const fn = createFunctionWithMethods(functionData, mockService);

      expect(fn.name).toBe(FUNCTION_TEST_CONSTANTS.NAME);
      expect(fn.slug).toBe(FUNCTION_TEST_CONSTANTS.SLUG);
      expect(fn.processSlug).toBe(FUNCTION_TEST_CONSTANTS.PROCESS_SLUG);
      expect(typeof fn.invoke).toBe('function');
    });

    describe('invoke', () => {
      it('should delegate to service.invoke with the captured name and folderId', async () => {
        const functionData = createBasicFunction();
        vi.mocked(mockService.invoke).mockResolvedValue(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);

        const fn = createFunctionWithMethods(functionData, mockService);
        const result = await fn.invoke(FUNCTION_TEST_CONSTANTS.INVOKE_INPUT);

        expect(mockService.invoke).toHaveBeenCalledWith(
          FUNCTION_TEST_CONSTANTS.NAME,
          FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
          { folderId: TEST_CONSTANTS.FOLDER_ID }
        );
        expect(result).toEqual(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
      });

      it('should delegate with undefined input when none is given', async () => {
        const functionData = createBasicFunction();
        vi.mocked(mockService.invoke).mockResolvedValue(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);

        const fn = createFunctionWithMethods(functionData, mockService);
        await fn.invoke();

        expect(mockService.invoke).toHaveBeenCalledWith(
          FUNCTION_TEST_CONSTANTS.NAME,
          undefined,
          { folderId: TEST_CONSTANTS.FOLDER_ID }
        );
      });

      it('should throw when the function name is missing', async () => {
        const functionData = createBasicFunction({ name: undefined as unknown as string });

        const fn = createFunctionWithMethods(functionData, mockService);

        await expect(fn.invoke(FUNCTION_TEST_CONSTANTS.INVOKE_INPUT)).rejects.toThrow(
          'Function name is undefined'
        );
        expect(mockService.invoke).not.toHaveBeenCalled();
      });

      it('should throw when the folderId is missing', async () => {
        const functionData = createBasicFunction({ folderId: undefined as unknown as number });

        const fn = createFunctionWithMethods(functionData, mockService);

        await expect(fn.invoke(FUNCTION_TEST_CONSTANTS.INVOKE_INPUT)).rejects.toThrow(
          'Function folderId is undefined'
        );
        expect(mockService.invoke).not.toHaveBeenCalled();
      });

      it('should propagate errors from the service', async () => {
        const functionData = createBasicFunction();
        vi.mocked(mockService.invoke).mockRejectedValue(new Error(TEST_CONSTANTS.ERROR_MESSAGE));

        const fn = createFunctionWithMethods(functionData, mockService);

        await expect(fn.invoke(FUNCTION_TEST_CONSTANTS.INVOKE_INPUT)).rejects.toThrow(
          TEST_CONSTANTS.ERROR_MESSAGE
        );
      });
    });
  });
});
