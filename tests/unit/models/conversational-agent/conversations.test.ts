// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createConversationWithMethods,
} from '@/models/conversational-agent/conversations/conversations.models';
import type { ConversationServiceModel, ConversationSessionMethods } from '@/models/conversational-agent/conversations/conversations.models';
import type { ExchangeServiceModel } from '@/models/conversational-agent/conversations/exchanges.models';
import { CONVERSATIONAL_AGENT_TEST_CONSTANTS, TEST_CONSTANTS } from '@tests/utils/mocks';
import { FeedbackRating } from '@/models/conversational-agent/conversations/types/core.types';

// ===== TEST CONSTANTS =====
const createMockConversationData = (overrides: Partial<any> = {}): any => ({
  id: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
  label: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_LABEL,
  createdTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
  updatedTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
  lastActivityTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.LAST_ACTIVITY_AT,
  agentId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID,
  autogenerateLabel: true,
  userId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_USER_ID,
  orgId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ORG_ID,
  tenantId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_TENANT_ID,
  folderId: TEST_CONSTANTS.FOLDER_ID,
  traceId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_TRACE_ID,
  ...overrides,
});

// ===== TEST SUITE =====
describe('Conversation Models', () => {
  let mockService: ConversationServiceModel;
  let mockSessionMethods: ConversationSessionMethods;
  let mockExchangeService: ExchangeServiceModel;

  beforeEach(() => {
    mockService = {
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
      connectionStatus: 'Disconnected',
      isConnected: false,
      connectionError: null,
      onConnectionStatusChanged: vi.fn(() => vi.fn()),
    } as any;

    mockSessionMethods = {
      startSession: vi.fn(),
      getSession: vi.fn(),
      endSession: vi.fn(),
    };

    mockExchangeService = {
      getAll: vi.fn(),
      getById: vi.fn(),
      createFeedback: vi.fn(),
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Conversation data and methods are combined correctly', () => {
    it('should preserve all conversation properties', () => {
      const data = createMockConversationData();
      const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

      expect(conversation.id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID);
      expect(conversation.label).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_LABEL);
      expect(conversation.createdTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT);
      expect(conversation.updatedTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT);
      expect(conversation.lastActivityTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.LAST_ACTIVITY_AT);
      expect(conversation.agentId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID);
      expect(conversation.autogenerateLabel).toBe(true);
      expect(conversation.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
    });

    it('should have all methods available', () => {
      const data = createMockConversationData();
      const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

      expect(typeof conversation.update).toBe('function');
      expect(typeof conversation.delete).toBe('function');
      expect(typeof conversation.startSession).toBe('function');
      expect(typeof conversation.getSession).toBe('function');
      expect(typeof conversation.endSession).toBe('function');
      expect(typeof conversation.uploadAttachment).toBe('function');
      expect(conversation.exchanges).toBeDefined();
      expect(typeof conversation.exchanges.getAll).toBe('function');
      expect(typeof conversation.exchanges.getById).toBe('function');
      expect(typeof conversation.exchanges.createFeedback).toBe('function');
    });
  });

  describe('conversation.update()', () => {
    it('should delegate to service.updateById with conversation id', async () => {
      const mockResponse = { id: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID, label: 'Updated' };
      (mockService.updateById as any).mockResolvedValue(mockResponse);

      const data = createMockConversationData();
      const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

      const result = await conversation.update({ label: 'Updated' });

      expect(mockService.updateById).toHaveBeenCalledWith(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        { label: 'Updated' }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should update autogenerateLabel', async () => {
      const mockResponse = { id: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID, autogenerateLabel: false };
      (mockService.updateById as any).mockResolvedValue(mockResponse);

      const data = createMockConversationData();
      const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

      const result = await conversation.update({ autogenerateLabel: false });

      expect(mockService.updateById).toHaveBeenCalledWith(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        { autogenerateLabel: false }
      );
      expect(result.autogenerateLabel).toBe(false);
    });

    it('should update both label and autogenerateLabel', async () => {
      const mockResponse = {
        id: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        label: 'Custom Label',
        autogenerateLabel: false,
      };
      (mockService.updateById as any).mockResolvedValue(mockResponse);

      const data = createMockConversationData();
      const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

      const result = await conversation.update({ label: 'Custom Label', autogenerateLabel: false });

      expect(mockService.updateById).toHaveBeenCalledWith(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        { label: 'Custom Label', autogenerateLabel: false }
      );
      expect(result.label).toBe('Custom Label');
      expect(result.autogenerateLabel).toBe(false);
    });

    it('should throw error if conversation id is undefined', async () => {
      const data = createMockConversationData({ id: undefined });
      const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

      await expect(conversation.update({ label: 'test' })).rejects.toThrow('Conversation ID is undefined');
    });
  });

  describe('conversation.delete()', () => {
    it('should delegate to service.deleteById with conversation id', async () => {
      const mockResponse = { id: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID };
      (mockService.deleteById as any).mockResolvedValue(mockResponse);

      const data = createMockConversationData();
      const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

      const result = await conversation.delete();

      expect(mockService.deleteById).toHaveBeenCalledWith(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error if conversation id is undefined', async () => {
      const data = createMockConversationData({ id: undefined });
      const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

      await expect(conversation.delete()).rejects.toThrow('Conversation ID is undefined');
    });
  });

  describe('conversation.startSession()', () => {
    it('should delegate to sessionMethods.startSession', () => {
      const mockSession = { id: 'session-1' };
      (mockSessionMethods.startSession as any).mockReturnValue(mockSession);

      const data = createMockConversationData();
      const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

      const result = conversation.startSession();

      expect(mockSessionMethods.startSession).toHaveBeenCalledWith(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        undefined
      );
      expect(result).toEqual(mockSession);
    });

    it('should pass options to startSession', () => {
      const mockSession = { id: 'session-1' };
      (mockSessionMethods.startSession as any).mockReturnValue(mockSession);

      const data = createMockConversationData();
      const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

      conversation.startSession({ resumeOnReconnect: true } as any);

      expect(mockSessionMethods.startSession).toHaveBeenCalledWith(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        { resumeOnReconnect: true }
      );
    });

    it('should throw error if conversation id is undefined', () => {
      const data = createMockConversationData({ id: undefined });
      const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

      expect(() => conversation.startSession()).toThrow('Conversation ID is undefined');
    });

    it('should throw error if session methods are not available', () => {
      const data = createMockConversationData();
      const conversation = createConversationWithMethods(data, mockService);

      expect(() => conversation.startSession()).toThrow('Session methods are not available');
    });
  });

  describe('conversation.getSession()', () => {
    it('should delegate to sessionMethods.getSession', () => {
      const mockSession = { id: 'session-1' };
      (mockSessionMethods.getSession as any).mockReturnValue(mockSession);

      const data = createMockConversationData();
      const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

      const result = conversation.getSession();

      expect(mockSessionMethods.getSession).toHaveBeenCalledWith(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID
      );
      expect(result).toEqual(mockSession);
    });

    it('should return undefined when no active session', () => {
      (mockSessionMethods.getSession as any).mockReturnValue(undefined);

      const data = createMockConversationData();
      const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

      expect(conversation.getSession()).toBeUndefined();
    });

    it('should throw error if conversation id is undefined', () => {
      const data = createMockConversationData({ id: undefined });
      const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

      expect(() => conversation.getSession()).toThrow('Conversation ID is undefined');
    });

    it('should throw error if session methods are not available', () => {
      const data = createMockConversationData();
      const conversation = createConversationWithMethods(data, mockService);

      expect(() => conversation.getSession()).toThrow('Session methods are not available');
    });
  });

  describe('conversation.endSession()', () => {
    it('should delegate to sessionMethods.endSession', () => {
      const data = createMockConversationData();
      const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

      conversation.endSession();

      expect(mockSessionMethods.endSession).toHaveBeenCalledWith(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID
      );
    });

    it('should throw error if conversation id is undefined', () => {
      const data = createMockConversationData({ id: undefined });
      const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

      expect(() => conversation.endSession()).toThrow('Conversation ID is undefined');
    });

    it('should throw error if session methods are not available', () => {
      const data = createMockConversationData();
      const conversation = createConversationWithMethods(data, mockService);

      expect(() => conversation.endSession()).toThrow('Session methods are not available');
    });
  });

  describe('conversation.uploadAttachment()', () => {
    it('should delegate to service.uploadAttachment with conversation id', async () => {
      const mockResponse = {
        uri: CONVERSATIONAL_AGENT_TEST_CONSTANTS.ATTACHMENT_URI,
        name: 'document.pdf',
        mimeType: 'application/pdf',
      };
      (mockService.uploadAttachment as any).mockResolvedValue(mockResponse);

      const data = createMockConversationData();
      const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

      const mockFile = new File(['content'], 'document.pdf', { type: 'application/pdf' });
      const result = await conversation.uploadAttachment(mockFile);

      expect(mockService.uploadAttachment).toHaveBeenCalledWith(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        mockFile
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error if conversation id is undefined', async () => {
      const data = createMockConversationData({ id: undefined });
      const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

      const mockFile = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
      await expect(conversation.uploadAttachment(mockFile)).rejects.toThrow('Conversation ID is undefined');
    });
  });

  describe('conversation.exchanges', () => {
    describe('exchanges.getAll()', () => {
      it('should delegate to exchangeService.getAll with conversation id', async () => {
        const mockResponse = { items: [], totalCount: 0 };
        (mockExchangeService.getAll as any).mockResolvedValue(mockResponse);

        const data = createMockConversationData();
        const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

        const result = await conversation.exchanges.getAll();

        expect(mockExchangeService.getAll).toHaveBeenCalledWith(
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
          undefined
        );
        expect(result).toEqual(mockResponse);
      });

      it('should pass options to exchangeService.getAll', async () => {
        const mockResponse = { items: [], totalCount: 0 };
        (mockExchangeService.getAll as any).mockResolvedValue(mockResponse);

        const data = createMockConversationData();
        const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

        await conversation.exchanges.getAll({ pageSize: 10 } as any);

        expect(mockExchangeService.getAll).toHaveBeenCalledWith(
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
          { pageSize: 10 }
        );
      });

      it('should throw error if conversation id is undefined', () => {
        const data = createMockConversationData({ id: undefined });
        const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

        expect(() => conversation.exchanges.getAll()).toThrow('Conversation ID is undefined');
      });

      it('should throw error if exchange service is not available', () => {
        const data = createMockConversationData();
        const conversation = createConversationWithMethods(data, mockService, mockSessionMethods);

        expect(() => conversation.exchanges.getAll()).toThrow('Exchange methods are not available');
      });
    });

    describe('exchanges.getById()', () => {
      it('should delegate to exchangeService.getById with conversation id', async () => {
        const mockResponse = { id: CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID, exchangeId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID, messages: [] };
        (mockExchangeService.getById as any).mockResolvedValue(mockResponse);

        const data = createMockConversationData();
        const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

        const result = await conversation.exchanges.getById(CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID);

        expect(mockExchangeService.getById).toHaveBeenCalledWith(
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
          undefined
        );
        expect(result).toEqual(mockResponse);
      });

      it('should pass options to exchangeService.getById', async () => {
        const mockResponse = { id: CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID, exchangeId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID, messages: [] };
        (mockExchangeService.getById as any).mockResolvedValue(mockResponse);

        const data = createMockConversationData();
        const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

        await conversation.exchanges.getById(CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID, { messageSort: 'descending' as any });

        expect(mockExchangeService.getById).toHaveBeenCalledWith(
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
          { messageSort: 'descending' }
        );
      });

      it('should throw error if conversation id is undefined', () => {
        const data = createMockConversationData({ id: undefined });
        const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

        expect(() => conversation.exchanges.getById(CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID)).toThrow('Conversation ID is undefined');
      });

      it('should throw error if exchange service is not available', () => {
        const data = createMockConversationData();
        const conversation = createConversationWithMethods(data, mockService, mockSessionMethods);

        expect(() => conversation.exchanges.getById(CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID)).toThrow('Exchange methods are not available');
      });
    });

    describe('exchanges.createFeedback()', () => {
      it('should delegate to exchangeService.createFeedback', async () => {
        const mockResponse = {};
        (mockExchangeService.createFeedback as any).mockResolvedValue(mockResponse);

        const data = createMockConversationData();
        const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

        const result = await conversation.exchanges.createFeedback(CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID, {
          rating: FeedbackRating.Positive,
          comment: 'Great!',
        });

        expect(mockExchangeService.createFeedback).toHaveBeenCalledWith(
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
          { rating: FeedbackRating.Positive, comment: 'Great!' }
        );
        expect(result).toEqual(mockResponse);
      });

      it('should throw error if conversation id is undefined', () => {
        const data = createMockConversationData({ id: undefined });
        const conversation = createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

        expect(
          () => conversation.exchanges.createFeedback(CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID, { rating: FeedbackRating.Positive })
        ).toThrow('Conversation ID is undefined');
      });

      it('should throw error if exchange service is not available', () => {
        const data = createMockConversationData();
        const conversation = createConversationWithMethods(data, mockService, mockSessionMethods);

        expect(
          () => conversation.exchanges.createFeedback(CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID, { rating: FeedbackRating.Positive })
        ).toThrow('Exchange methods are not available');
      });
    });
  });

  describe('data isolation', () => {
    it('should not modify the original conversation data', () => {
      const data = createMockConversationData();
      const originalId = data.id;

      createConversationWithMethods(data, mockService, mockSessionMethods, mockExchangeService);

      expect(data.id).toBe(originalId);
      expect(data.update).toBeUndefined();
      expect(data.delete).toBeUndefined();
    });
  });
});
