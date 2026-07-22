// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FunctionService } from '../../../../src/services/orchestrator/functions';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createMockRawFunctionTrigger } from '../../../utils/mocks/functions';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { FUNCTION_TEST_CONSTANTS } from '../../../utils/constants/functions';
import { FUNCTION_ENDPOINTS } from '../../../../src/utils/constants/endpoints';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

// Browser environment: the invoke leg must rely on the engine's automatic
// redirect handling — no manual 303 chain, no raw response handling.
vi.mock('../../../../src/utils/platform', () => ({ isBrowser: true }));

// ===== TEST SUITE =====
describe('FunctionService invoke in browser environments', () => {
  let functionService: FunctionService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });

    functionService = new FunctionService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should invoke via automatic redirect handling (no manual redirect, no raw response)', async () => {
    mockApiClient.get
      .mockResolvedValueOnce({ value: [createMockRawFunctionTrigger()] })
      .mockResolvedValueOnce({ Key: FUNCTION_TEST_CONSTANTS.FOLDER_KEY });
    mockApiClient.post.mockResolvedValueOnce(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);

    const result = await functionService.invoke(
      FUNCTION_TEST_CONSTANTS.NAME,
      FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
      { folderId: TEST_CONSTANTS.FOLDER_ID }
    );

    expect(mockApiClient.post).toHaveBeenCalledWith(
      FUNCTION_ENDPOINTS.INVOKE(
        FUNCTION_TEST_CONSTANTS.FOLDER_KEY,
        FUNCTION_TEST_CONSTANTS.PROCESS_SLUG,
        FUNCTION_TEST_CONSTANTS.SLUG
      ),
      FUNCTION_TEST_CONSTANTS.INVOKE_INPUT,
      expect.not.objectContaining({ redirect: 'manual' })
    );
    const spec = mockApiClient.post.mock.calls[0][2];
    expect(spec.responseType).toBeUndefined();

    expect(result).toEqual(FUNCTION_TEST_CONSTANTS.INVOKE_OUTPUT);
  });
});
