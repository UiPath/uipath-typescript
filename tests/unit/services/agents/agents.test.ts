// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentService } from '../../../../src/services/agents/agents';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { AGENTS_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { AGENT_TEST_CONSTANTS } from '../../../utils/constants';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

// ===== TEST SUITE =====
describe('AgentService Unit Tests', () => {
  let agentService: AgentService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);
    agentService = new AgentService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getNames', () => {
    it('should get all agent names successfully', async () => {
      const mockResponse = {
        agents: [
          AGENT_TEST_CONSTANTS.AGENT_NAME_1,
          AGENT_TEST_CONSTANTS.AGENT_NAME_2,
          AGENT_TEST_CONSTANTS.AGENT_NAME_3,
        ],
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await agentService.getNames();

      expect(result).toBeDefined();
      expect(result.agents).toEqual(mockResponse.agents);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_NAMES,
        {},
        expect.any(Object)
      );
    });

    it('should send FolderKeys when folderKeys option is provided', async () => {
      mockApiClient.post.mockResolvedValue({ agents: [] });

      const folderKeys = [
        AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
        AGENT_TEST_CONSTANTS.FOLDER_KEY_2,
      ];

      await agentService.getNames({ folderKeys });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_NAMES,
        { FolderKeys: folderKeys },
        expect.any(Object)
      );
    });

    it('should return an empty array when no agent names are found', async () => {
      mockApiClient.post.mockResolvedValue({ agents: [] });

      const result = await agentService.getNames();

      expect(result.agents).toEqual([]);
    });

    it('should propagate API errors', async () => {
      const error = new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
      mockApiClient.post.mockRejectedValue(error);

      await expect(agentService.getNames()).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });
});
