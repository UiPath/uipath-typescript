// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAgentWithMethods } from '@/models/conversational-agent/agents/agents.models';
import type { ConversationServiceModel } from '@/models/conversational-agent/conversations/conversations.models';
import { CONVERSATIONAL_AGENT_TEST_CONSTANTS, TEST_CONSTANTS } from '@tests/utils/mocks';

// ===== TEST CONSTANTS =====
const createMockAgentData = (overrides: Partial<any> = {}): any => ({
  id: CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID,
  name: CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_NAME,
  description: CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_DESCRIPTION,
  folderId: TEST_CONSTANTS.FOLDER_ID,
  createdTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
  updatedTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
  ...overrides,
});

// ===== TEST SUITE =====
describe('Agent Models', () => {
  let mockConversationService: ConversationServiceModel;

  beforeEach(() => {
    mockConversationService = {
      create: vi.fn(),
      getAll: vi.fn(),
      getById: vi.fn(),
      updateById: vi.fn(),
      deleteById: vi.fn(),
      uploadAttachment: vi.fn(),
      startSession: vi.fn(),
      getSession: vi.fn(),
      endSession: vi.fn(),
      sessions: [],
      connectionStatus: 'Connected',
      isConnected: true,
      connectionError: null,
      onConnectionStatusChanged: vi.fn(() => vi.fn()),
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Agent data and methods are combined correctly', () => {
    it('should preserve all agent properties', () => {
      const agentData = createMockAgentData();
      const agent = createAgentWithMethods(agentData, mockConversationService);

      expect(agent.id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID);
      expect(agent.name).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_NAME);
      expect(agent.description).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_DESCRIPTION);
      expect(agent.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect(agent.createdTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT);
      expect(agent.updatedTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT);
    });

    it('should have conversations service available', () => {
      const agentData = createMockAgentData();
      const agent = createAgentWithMethods(agentData, mockConversationService);

      expect(agent.conversations).toBeDefined();
      expect(typeof agent.conversations.create).toBe('function');
    });

    it('should have connection properties available', () => {
      const agentData = createMockAgentData();
      const agent = createAgentWithMethods(agentData, mockConversationService);

      expect(agent.connectionStatus).toBeDefined();
      expect(typeof agent.isConnected).toBe('boolean');
      expect(agent.connectionError).toBeDefined();
    });
  });

  describe('conversations.create()', () => {
    it('should create a conversation using agent agentId and folderId', async () => {
      const mockConversation = {
        id: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        label: 'Test Conversation',
      };
      (mockConversationService.create as any).mockResolvedValue(mockConversation);

      const agentData = createMockAgentData();
      const agent = createAgentWithMethods(agentData, mockConversationService);

      const result = await agent.conversations.create();

      expect(mockConversationService.create).toHaveBeenCalledWith(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID,
        TEST_CONSTANTS.FOLDER_ID,
        {}
      );
      expect(result).toEqual(mockConversation);
    });

    it('should pass options to conversation service create', async () => {
      const mockConversation = {
        id: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        label: 'Custom Label',
      };
      (mockConversationService.create as any).mockResolvedValue(mockConversation);

      const agentData = createMockAgentData();
      const agent = createAgentWithMethods(agentData, mockConversationService);

      const result = await agent.conversations.create({ label: 'Custom Label' });

      expect(mockConversationService.create).toHaveBeenCalledWith(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID,
        TEST_CONSTANTS.FOLDER_ID,
        { label: 'Custom Label' }
      );
      expect(result.label).toBe('Custom Label');
    });

    it('should pass autogenerateLabel option', async () => {
      const mockConversation = {
        id: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        label: 'Manual Label',
        autogenerateLabel: false,
      };
      (mockConversationService.create as any).mockResolvedValue(mockConversation);

      const agentData = createMockAgentData();
      const agent = createAgentWithMethods(agentData, mockConversationService);

      const result = await agent.conversations.create({
        label: 'Manual Label',
        autogenerateLabel: false,
      });

      expect(mockConversationService.create).toHaveBeenCalledWith(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID,
        TEST_CONSTANTS.FOLDER_ID,
        { label: 'Manual Label', autogenerateLabel: false }
      );
      expect(result.autogenerateLabel).toBe(false);
    });
  });

  describe('connection properties', () => {
    it('should delegate connectionStatus to conversation service', () => {
      const agentData = createMockAgentData();
      const agent = createAgentWithMethods(agentData, mockConversationService);

      expect(agent.connectionStatus).toBe('Connected');
    });

    it('should delegate isConnected to conversation service', () => {
      const agentData = createMockAgentData();
      const agent = createAgentWithMethods(agentData, mockConversationService);

      expect(agent.isConnected).toBe(true);
    });

    it('should delegate connectionError to conversation service', () => {
      const agentData = createMockAgentData();
      const agent = createAgentWithMethods(agentData, mockConversationService);

      expect(agent.connectionError).toBeNull();
    });

    it('should reflect changed connection status', () => {
      const serviceWithError = {
        ...mockConversationService,
        connectionStatus: 'Disconnected',
        isConnected: false,
        connectionError: new Error('Connection lost'),
      };

      const agentData = createMockAgentData();
      const agent = createAgentWithMethods(agentData, serviceWithError as any);

      expect(agent.connectionStatus).toBe('Disconnected');
      expect(agent.isConnected).toBe(false);
      expect(agent.connectionError).toBeInstanceOf(Error);
      expect(agent.connectionError?.message).toBe('Connection lost');
    });
  });

  describe('data isolation', () => {
    it('should not modify the original agent data', () => {
      const agentData = createMockAgentData();
      const originalId = agentData.id;

      createAgentWithMethods(agentData, mockConversationService);

      expect(agentData.id).toBe(originalId);
      expect(agentData.conversations).toBeUndefined();
    });
  });
});
