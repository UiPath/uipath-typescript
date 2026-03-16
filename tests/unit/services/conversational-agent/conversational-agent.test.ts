// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConversationalAgentService } from '@/services/conversational-agent/conversational-agent';
import { ApiClient } from '@/core/http/api-client';
import {
  createMockRawAgent,
  createMockRawAgentById,
  createMockFeatureFlags,
  createMockError,
  CONVERSATIONAL_AGENT_TEST_CONSTANTS,
  TEST_CONSTANTS,
} from '@tests/utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '@tests/utils/setup';
import { AGENT_ENDPOINTS, FEATURE_ENDPOINTS } from '@/utils/constants/endpoints';

// ===== MOCKING =====
vi.mock('@/core/http/api-client');

// Mock SessionManager to avoid WebSocket side effects
vi.mock('@/services/conversational-agent/conversations/session/session-manager', () => ({
  SessionManager: vi.fn().mockImplementation(() => ({
    connectionStatus: 'Disconnected',
    isConnected: false,
    connectionError: null,
    onConnectionStatusChanged: vi.fn(() => vi.fn()),
    setLogLevel: vi.fn(),
    setEventDispatcher: vi.fn(),
    emitEvent: vi.fn(),
  }))
}));

// ===== TEST SUITE =====
describe('ConversationalAgentService Unit Tests', () => {
  let conversationalAgent: ConversationalAgentService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    conversationalAgent = new ConversationalAgentService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should get all agents successfully with fields mapped correctly', async () => {
      const mockAgents = [createMockRawAgent(), createMockRawAgent({ id: 789, name: 'Agent 2' })];
      mockApiClient.get.mockResolvedValue(mockAgents);

      const result = await conversationalAgent.getAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID);
      expect(result[0].name).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_NAME);
      expect(result[0].description).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_DESCRIPTION);
      expect(result[0].processVersion).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_PROCESS_VERSION);
      expect(result[0].processKey).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_PROCESS_KEY);
      expect(result[0].folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect(result[0].feedId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_FEED_ID);
      expect(result[1].id).toBe(789);
      expect(result[1].name).toBe('Agent 2');

      // Verify the API call
      expect(mockApiClient.get).toHaveBeenCalledWith(
        AGENT_ENDPOINTS.LIST,
        expect.objectContaining({
          params: undefined
        })
      );
    });

    it('should get all agents filtered by folderId', async () => {
      const mockAgents = [createMockRawAgent()];
      mockApiClient.get.mockResolvedValue(mockAgents);

      const result = await conversationalAgent.getAll(TEST_CONSTANTS.FOLDER_ID);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);

      // Verify folderId is passed as a query param
      expect(mockApiClient.get).toHaveBeenCalledWith(
        AGENT_ENDPOINTS.LIST,
        expect.objectContaining({
          params: { folderId: TEST_CONSTANTS.FOLDER_ID }
        })
      );
    });

    it('should transform field names correctly (createdAt -> createdTime)', async () => {
      const mockAgents = [createMockRawAgent()];
      mockApiClient.get.mockResolvedValue(mockAgents);

      const result = await conversationalAgent.getAll();

      // Verify transformed fields
      expect(result[0].createdTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT);
      expect((result[0] as any).createdAt).toBeUndefined();

      // updatedAt -> updatedTime (from CommonFieldMap)
      expect((result[0] as any).updatedTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT);
      expect((result[0] as any).updatedAt).toBeUndefined();
    });

    it('should add agent methods (conversations) to returned agents', async () => {
      const mockAgents = [createMockRawAgent()];
      mockApiClient.get.mockResolvedValue(mockAgents);

      const result = await conversationalAgent.getAll();

      // Verify agent has conversations property (from createAgentWithMethods)
      expect(result[0].conversations).toBeDefined();
      expect(typeof result[0].conversations.create).toBe('function');
    });

    it('should add connection properties to returned agents', async () => {
      const mockAgents = [createMockRawAgent()];
      mockApiClient.get.mockResolvedValue(mockAgents);

      const result = await conversationalAgent.getAll();

      // Verify connection properties exist
      expect(result[0].connectionStatus).toBeDefined();
      expect(typeof result[0].isConnected).toBe('boolean');
      expect(result[0].connectionError).toBeNull();
    });

    it('should return empty array when no agents exist', async () => {
      mockApiClient.get.mockResolvedValue([]);

      const result = await conversationalAgent.getAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
    });

    it('should handle API errors', async () => {
      const error = createMockError(CONVERSATIONAL_AGENT_TEST_CONSTANTS.ERROR_AGENT_NOT_FOUND);
      mockApiClient.get.mockRejectedValue(error);

      await expect(conversationalAgent.getAll()).rejects.toThrow(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.ERROR_AGENT_NOT_FOUND
      );
    });
  });

  describe('getById', () => {
    it('should get agent by ID successfully with all fields mapped correctly', async () => {
      const mockAgent = createMockRawAgentById();
      mockApiClient.get.mockResolvedValue(mockAgent);

      const result = await conversationalAgent.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID,
        TEST_CONSTANTS.FOLDER_ID
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID);
      expect(result.name).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_NAME);
      expect(result.description).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_DESCRIPTION);
      expect(result.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);

      // Verify the API call uses the correct endpoint
      expect(mockApiClient.get).toHaveBeenCalledWith(
        AGENT_ENDPOINTS.GET(TEST_CONSTANTS.FOLDER_ID, CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID),
        expect.any(Object)
      );
    });

    it('should include appearance data for getById', async () => {
      const mockAgent = createMockRawAgentById();
      mockApiClient.get.mockResolvedValue(mockAgent);

      const result = await conversationalAgent.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID,
        TEST_CONSTANTS.FOLDER_ID
      );

      expect(result.appearance).toBeDefined();
      expect(result.appearance?.welcomeTitle).toBe(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.WELCOME_TITLE
      );
      expect(result.appearance?.welcomeDescription).toBe(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.WELCOME_DESCRIPTION
      );
      expect(result.appearance?.startingPrompts).toHaveLength(1);
      expect(result.appearance?.startingPrompts?.[0].displayPrompt).toBe(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.STARTING_PROMPT_DISPLAY
      );
    });

    it('should transform field names correctly', async () => {
      const mockAgent = createMockRawAgentById();
      mockApiClient.get.mockResolvedValue(mockAgent);

      const result = await conversationalAgent.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID,
        TEST_CONSTANTS.FOLDER_ID
      );

      // createdAt -> createdTime
      expect(result.createdTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT);
      expect((result as any).createdAt).toBeUndefined();
    });

    it('should add agent methods to returned agent', async () => {
      const mockAgent = createMockRawAgentById();
      mockApiClient.get.mockResolvedValue(mockAgent);

      const result = await conversationalAgent.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID,
        TEST_CONSTANTS.FOLDER_ID
      );

      expect(result.conversations).toBeDefined();
      expect(typeof result.conversations.create).toBe('function');
    });

    it('should handle API errors', async () => {
      const error = createMockError(CONVERSATIONAL_AGENT_TEST_CONSTANTS.ERROR_AGENT_NOT_FOUND);
      mockApiClient.get.mockRejectedValue(error);

      await expect(
        conversationalAgent.getById(CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID, TEST_CONSTANTS.FOLDER_ID)
      ).rejects.toThrow(CONVERSATIONAL_AGENT_TEST_CONSTANTS.ERROR_AGENT_NOT_FOUND);
    });
  });

  describe('getFeatureFlags', () => {
    it('should get feature flags successfully', async () => {
      const mockFlags = createMockFeatureFlags();
      mockApiClient.get.mockResolvedValue(mockFlags);

      const result = await conversationalAgent.getFeatureFlags();

      expect(result).toBeDefined();
      expect(result[CONVERSATIONAL_AGENT_TEST_CONSTANTS.FEATURE_FLAG_KEY]).toBe(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.FEATURE_FLAG_VALUE
      );

      // Verify the endpoint
      expect(mockApiClient.get).toHaveBeenCalledWith(
        FEATURE_ENDPOINTS.FEATURE_FLAGS,
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(conversationalAgent.getFeatureFlags()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('onConnectionStatusChanged', () => {
    it('should delegate to conversations service', () => {
      const handler = vi.fn();

      const cleanup = conversationalAgent.onConnectionStatusChanged(handler);

      expect(cleanup).toBeDefined();
      expect(typeof cleanup).toBe('function');
    });
  });

  describe('conversations property', () => {
    it('should expose conversations service', () => {
      expect(conversationalAgent.conversations).toBeDefined();
    });
  });
});
