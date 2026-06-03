// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentService } from '../../../../src/services/agents/agents';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { AGENTS_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { AgentListSortColumn } from '../../../../src/models/agents/agents.types';
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

  describe('getAll', () => {
    const startTime = AGENT_TEST_CONSTANTS.START_TIME;
    const endTime = AGENT_TEST_CONSTANTS.END_TIME;
    const mockAgent = {
      agentId: AGENT_TEST_CONSTANTS.AGENT_ID,
      agentName: AGENT_TEST_CONSTANTS.AGENT_NAME_1,
      parentProcess: '',
      folderKey: AGENT_TEST_CONSTANTS.FOLDER_KEY_1,
      folderName: AGENT_TEST_CONSTANTS.FOLDER_NAME,
      folderPath: AGENT_TEST_CONSTANTS.FOLDER_PATH,
      lastRun: AGENT_TEST_CONSTANTS.JOB_START_TIME,
      processKey: AGENT_TEST_CONSTANTS.PROCESS_KEY,
      processVersion: AGENT_TEST_CONSTANTS.PROCESS_VERSION,
      healthScore: 0,
      lastIncidentType: 'ERROR',
      unitsQuantity: 1.0,
      unitsName: null,
      quantityAGU: 1.0,
      quantityPLTU: 0.0,
    };

    it('should return non-paginated response (items + totals) when no pagination options are provided', async () => {
      const mockEnvelope = {
        pagination: { totalCount: 114, pageNumber: 0, pageSize: 10 },
        data: {
          agents: [mockAgent],
          totalUnitsConsumed: 282.0,
          totalAGUnitsConsumed: 282.0,
          totalPLTUnitsConsumed: 13.4,
        },
      };
      mockApiClient.post.mockResolvedValue(mockEnvelope);

      const result = await agentService.getAll(startTime, endTime);

      expect(result.items).toEqual([mockAgent]);
      expect(result.totalCount).toBe(114);
      expect(result.totalUnitsConsumed).toBe(282.0);
      expect(result.totalAGUnitsConsumed).toBe(282.0);
      expect(result.totalPLTUnitsConsumed).toBe(13.4);
      // Non-paginated — no navigation fields
      expect((result as { hasNextPage?: boolean }).hasNextPage).toBeUndefined();
      expect((result as { nextCursor?: unknown }).nextCursor).toBeUndefined();
      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_AGENTS,
        { startTime, endTime },
        expect.any(Object),
      );
    });

    it('should send pageSize + 0-indexed pageNumber when pageSize is provided', async () => {
      mockApiClient.post.mockResolvedValue({ pagination: { totalCount: 0, pageNumber: 0, pageSize: 25 }, data: { agents: [] } });

      await agentService.getAll(startTime, endTime, { pageSize: 25 });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_AGENTS,
        { startTime, endTime, pageNumber: 0, pageSize: 25 },
        expect.any(Object),
      );
    });

    it('should convert jumpToPage (1-indexed) to API pageNumber (0-indexed)', async () => {
      mockApiClient.post.mockResolvedValue({ pagination: { totalCount: 0, pageNumber: 2, pageSize: 10 }, data: { agents: [] } });

      await agentService.getAll(startTime, endTime, { jumpToPage: 3, pageSize: 10 });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_AGENTS,
        { startTime, endTime, pageNumber: 2, pageSize: 10 },
        expect.any(Object),
      );
    });

    it('should send orderBy in the camelCase body', async () => {
      mockApiClient.post.mockResolvedValue({ pagination: { totalCount: 0, pageNumber: 0, pageSize: 10 }, data: { agents: [] } });

      const orderBy = { column: AgentListSortColumn.HealthScore, desc: true };

      await agentService.getAll(startTime, endTime, { pageSize: 10, orderBy });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTS_ENDPOINTS.GET_AGENTS,
        { startTime, endTime, pageNumber: 0, pageSize: 10, orderBy },
        expect.any(Object),
      );
    });

    it('should return paginated response with hasNextPage + nextCursor when more pages exist', async () => {
      mockApiClient.post.mockResolvedValue({
        pagination: { totalCount: 114, pageNumber: 0, pageSize: 10 },
        data: {
          agents: Array(10).fill(mockAgent),
          totalUnitsConsumed: 282.0,
          totalAGUnitsConsumed: 282.0,
          totalPLTUnitsConsumed: 13.4,
        },
      });

      const result = await agentService.getAll(startTime, endTime, { pageSize: 10 });

      expect(result.items.length).toBe(10);
      expect(result.totalCount).toBe(114);
      expect(result.totalUnitsConsumed).toBe(282.0);
      expect((result as { hasNextPage?: boolean }).hasNextPage).toBe(true);
      expect((result as { nextCursor?: unknown }).nextCursor).toBeDefined();
      expect((result as { currentPage?: number }).currentPage).toBe(1);
      expect((result as { totalPages?: number }).totalPages).toBe(12);
    });

    it('should return response with empty items when API returns an empty envelope', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await agentService.getAll(startTime, endTime);

      expect(result.items).toEqual([]);
      expect(result.totalUnitsConsumed).toBeUndefined();
      expect(result.totalAGUnitsConsumed).toBeUndefined();
      expect(result.totalPLTUnitsConsumed).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      const error = new Error(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        agentService.getAll(startTime, endTime),
      ).rejects.toThrow(AGENT_TEST_CONSTANTS.ERROR_GENERIC);
    });
  });
});
