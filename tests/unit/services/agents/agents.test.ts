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

// Mirrors the live API envelope: items nested under data.agents, total count under
// pagination.totalCount. (The API also returns aggregate consumption totals alongside
// the items, but the SDK does not surface them, so they are omitted here.)
const buildEnvelope = (agents: unknown[], totalCount: number, pageNumber = 0, pageSize = 10) => ({
  pagination: { totalCount, pageNumber, pageSize },
  data: { agents },
});

// ===== TEST SUITE =====
describe('AgentService Unit Tests', () => {
  let agentService: AgentService;
  let mockApiClient: any;

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

    it('should return non-paginated response (items + totalCount) when no pagination options are provided', async () => {
      mockApiClient.post.mockResolvedValue(buildEnvelope([mockAgent], 114));

      const result = await agentService.getAll(startTime, endTime);

      expect(result.items).toEqual([mockAgent]);
      expect(result.totalCount).toBe(114);
      // Non-paginated — no navigation fields
      expect((result as { hasNextPage?: boolean }).hasNextPage).toBeUndefined();
      expect((result as { nextCursor?: unknown }).nextCursor).toBeUndefined();

      // Non-paginated body carries no pagination params
      const [endpoint, body] = mockApiClient.post.mock.calls[0];
      expect(endpoint).toBe(AGENTS_ENDPOINTS.GET_AGENTS);
      expect(body.startTime).toBe(startTime);
      expect(body.endTime).toBe(endTime);
      expect(body.pageNumber).toBeUndefined();
      expect(body.pageSize).toBeUndefined();
    });

    it('should send pageSize + 0-based pageNumber when pageSize is provided', async () => {
      mockApiClient.post.mockResolvedValue(buildEnvelope([], 0, 0, 25));

      await agentService.getAll(startTime, endTime, { pageSize: 25 });

      const [endpoint, body] = mockApiClient.post.mock.calls[0];
      expect(endpoint).toBe(AGENTS_ENDPOINTS.GET_AGENTS);
      expect(body.startTime).toBe(startTime);
      expect(body.endTime).toBe(endTime);
      expect(body.pageNumber).toBe(0);
      expect(body.pageSize).toBe(25);
    });

    it('should convert jumpToPage (1-based) to a 0-based pageNumber', async () => {
      mockApiClient.post.mockResolvedValue(buildEnvelope([], 0, 2, 10));

      await agentService.getAll(startTime, endTime, { jumpToPage: 3, pageSize: 10 });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.pageNumber).toBe(2);
      expect(body.pageSize).toBe(10);
    });

    it('should send orderBy in the camelCase body', async () => {
      mockApiClient.post.mockResolvedValue(buildEnvelope([], 0, 0, 10));

      const orderBy = { column: AgentListSortColumn.HealthScore, desc: true };

      await agentService.getAll(startTime, endTime, { pageSize: 10, orderBy });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.orderBy).toEqual(orderBy);
      expect(body.pageNumber).toBe(0);
      expect(body.pageSize).toBe(10);
    });

    it('should pass array filters through the body without OData prefixing', async () => {
      mockApiClient.post.mockResolvedValue(buildEnvelope([], 0, 0, 10));

      const folderKeys = [AGENT_TEST_CONSTANTS.FOLDER_KEY_1];
      await agentService.getAll(startTime, endTime, { pageSize: 10, folderKeys });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.folderKeys).toEqual(folderKeys);
      expect(body['$folderKeys']).toBeUndefined();
    });

    it('should return paginated response with hasNextPage + nextCursor when more pages exist', async () => {
      mockApiClient.post.mockResolvedValue(buildEnvelope(Array(10).fill(mockAgent), 114, 0, 10));

      const result = await agentService.getAll(startTime, endTime, { pageSize: 10 });

      expect(result.items.length).toBe(10);
      expect(result.totalCount).toBe(114);
      expect((result as { hasNextPage?: boolean }).hasNextPage).toBe(true);
      expect((result as { nextCursor?: unknown }).nextCursor).toBeDefined();
      expect((result as { currentPage?: number }).currentPage).toBe(1);
      expect((result as { totalPages?: number }).totalPages).toBe(12);
    });

    it('should return empty items when no agents match the window', async () => {
      mockApiClient.post.mockResolvedValue(buildEnvelope([], 0));

      const result = await agentService.getAll(startTime, endTime);

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
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
