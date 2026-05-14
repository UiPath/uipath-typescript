// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentMonitoringService } from '../../../../src/services/agents/monitoring/monitoring';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { AGENT_MONITORING_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { AGENT_MONITORING_TEST_CONSTANTS } from '../../../utils/constants';
import { ValidationError } from '../../../../src/core/errors';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

// ===== TEST SUITE =====
describe('AgentMonitoringService Unit Tests', () => {
  let agentMonitoringService: AgentMonitoringService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);
    agentMonitoringService = new AgentMonitoringService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getNames', () => {
    it('should get all agent names successfully', async () => {
      const mockResponse = {
        agents: [
          AGENT_MONITORING_TEST_CONSTANTS.AGENT_NAME_1,
          AGENT_MONITORING_TEST_CONSTANTS.AGENT_NAME_2,
          AGENT_MONITORING_TEST_CONSTANTS.AGENT_NAME_3,
        ],
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await agentMonitoringService.getNames(AGENT_MONITORING_TEST_CONSTANTS.TENANT_ID);

      expect(result).toBeDefined();
      expect(result.agents).toEqual(mockResponse.agents);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENT_MONITORING_ENDPOINTS.GET_NAMES,
        { TenantId: AGENT_MONITORING_TEST_CONSTANTS.TENANT_ID },
        expect.any(Object)
      );
    });

    it('should send FolderKeys when folderKeys option is provided', async () => {
      mockApiClient.post.mockResolvedValue({ agents: [] });

      const folderKeys = [
        AGENT_MONITORING_TEST_CONSTANTS.FOLDER_KEY_1,
        AGENT_MONITORING_TEST_CONSTANTS.FOLDER_KEY_2,
      ];

      await agentMonitoringService.getNames(AGENT_MONITORING_TEST_CONSTANTS.TENANT_ID, { folderKeys });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENT_MONITORING_ENDPOINTS.GET_NAMES,
        {
          TenantId: AGENT_MONITORING_TEST_CONSTANTS.TENANT_ID,
          FolderKeys: folderKeys,
        },
        expect.any(Object)
      );
    });

    it('should return an empty array when no agent names are found', async () => {
      mockApiClient.post.mockResolvedValue({ agents: [] });

      const result = await agentMonitoringService.getNames(AGENT_MONITORING_TEST_CONSTANTS.TENANT_ID);

      expect(result.agents).toEqual([]);
    });

    it('should throw ValidationError when tenantId is empty', async () => {
      await expect(agentMonitoringService.getNames('')).rejects.toThrow(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should propagate API errors', async () => {
      const error = new Error(AGENT_MONITORING_TEST_CONSTANTS.ERROR_GENERIC);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        agentMonitoringService.getNames(AGENT_MONITORING_TEST_CONSTANTS.TENANT_ID)
      ).rejects.toThrow(AGENT_MONITORING_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });
});
