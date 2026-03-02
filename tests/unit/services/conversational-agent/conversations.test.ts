// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConversationalAgentService } from '@/services/conversational-agent/conversational-agent';
import { ApiClient } from '@/core/http/api-client';
import { PaginationHelpers } from '@/utils/pagination/helpers';
import {
  createMockRawConversation,
  createMockTransformedConversationCollection,
  createMockAttachmentCreateResponse,
  createMockError,
  CONVERSATIONAL_AGENT_TEST_CONSTANTS,
  TEST_CONSTANTS,
} from '@tests/utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '@tests/utils/setup';
import { CONVERSATION_ENDPOINTS, ATTACHMENT_ENDPOINTS } from '@/utils/constants/endpoints';

// ===== MOCKING =====
vi.mock('@/core/http/api-client');

// Import mock objects using vi.hoisted()
const mocks = vi.hoisted(() => {
  return import('@tests/utils/mocks/core');
});

// Mock pagination helpers (do NOT mock transformData - test real transformation)
vi.mock('@/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

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
describe('ConversationalAgent.conversations Unit Tests', () => {
  let conversationalAgent: ConversationalAgentService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    // Reset pagination helpers mock before each test
    vi.mocked(PaginationHelpers.getAll).mockReset();

    conversationalAgent = new ConversationalAgentService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a conversation successfully', async () => {
      const mockConversation = createMockRawConversation();
      mockApiClient.post.mockResolvedValue(mockConversation);

      const result = await conversationalAgent.conversations.create(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID,
        TEST_CONSTANTS.FOLDER_ID
      );

      expect(result).toBeDefined();
      // Verify field transformations: conversationId -> id
      expect(result.id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID);
      expect((result as any).conversationId).toBeUndefined();

      // lastActivityAt -> lastActivityTime
      expect(result.lastActivityTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.LAST_ACTIVITY_AT);
      expect((result as any).lastActivityAt).toBeUndefined();

      // agentReleaseId -> agentId
      expect(result.agentId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID);
      expect((result as any).agentReleaseId).toBeUndefined();

      // createdAt -> createdTime
      expect(result.createdTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT);
      expect((result as any).createdAt).toBeUndefined();

      // updatedAt -> updatedTime
      expect((result as any).updatedTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT);
      expect((result as any).updatedAt).toBeUndefined();

      // Verify the API call
      expect(mockApiClient.post).toHaveBeenCalledWith(
        CONVERSATION_ENDPOINTS.CREATE,
        // transformRequest reverses the map: agentId -> agentReleaseId, folderId stays
        expect.objectContaining({
          agentReleaseId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID,
          folderId: TEST_CONSTANTS.FOLDER_ID
        }),
        expect.any(Object)
      );
    });

    it('should create a conversation with options', async () => {
      const mockConversation = createMockRawConversation({ label: 'Custom Label' });
      mockApiClient.post.mockResolvedValue(mockConversation);

      const result = await conversationalAgent.conversations.create(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID,
        TEST_CONSTANTS.FOLDER_ID,
        { label: 'Custom Label', autogenerateLabel: false }
      );

      expect(result).toBeDefined();
      expect(result.label).toBe('Custom Label');
    });

    it('should add conversation methods to response', async () => {
      const mockConversation = createMockRawConversation();
      mockApiClient.post.mockResolvedValue(mockConversation);

      const result = await conversationalAgent.conversations.create(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID,
        TEST_CONSTANTS.FOLDER_ID
      );

      // Verify methods are attached
      expect(typeof result.update).toBe('function');
      expect(typeof result.delete).toBe('function');
      expect(typeof result.startSession).toBe('function');
      expect(typeof result.getSession).toBe('function');
      expect(typeof result.endSession).toBe('function');
      expect(typeof result.uploadAttachment).toBe('function');
      expect(result.exchanges).toBeDefined();
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        conversationalAgent.conversations.create(CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID, TEST_CONSTANTS.FOLDER_ID)
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getById', () => {
    it('should get conversation by ID successfully with fields mapped', async () => {
      const mockConversation = createMockRawConversation();
      mockApiClient.get.mockResolvedValue(mockConversation);

      const result = await conversationalAgent.conversations.getById(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID);

      expect(result).toBeDefined();
      expect(result.id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID);
      expect(result.label).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_LABEL);
      expect(result.lastActivityTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.LAST_ACTIVITY_AT);
      expect(result.agentId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID);
      expect(result.createdTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT);

      // Verify the correct endpoint is called
      expect(mockApiClient.get).toHaveBeenCalledWith(
        CONVERSATION_ENDPOINTS.GET(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID),
        expect.any(Object)
      );
    });

    it('should add conversation methods to response', async () => {
      const mockConversation = createMockRawConversation();
      mockApiClient.get.mockResolvedValue(mockConversation);

      const result = await conversationalAgent.conversations.getById(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID);

      expect(typeof result.update).toBe('function');
      expect(typeof result.delete).toBe('function');
      expect(typeof result.startSession).toBe('function');
      expect(result.exchanges).toBeDefined();
    });

    it('should verify original API fields are removed after transformation', async () => {
      const mockConversation = createMockRawConversation();
      mockApiClient.get.mockResolvedValue(mockConversation);

      const result = await conversationalAgent.conversations.getById(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID);

      // Original API field names should not exist
      expect((result as any).conversationId).toBeUndefined();
      expect((result as any).lastActivityAt).toBeUndefined();
      expect((result as any).agentReleaseId).toBeUndefined();
      expect((result as any).createdAt).toBeUndefined();
      expect((result as any).updatedAt).toBeUndefined();
    });

    it('should handle API errors', async () => {
      const error = createMockError(CONVERSATIONAL_AGENT_TEST_CONSTANTS.ERROR_CONVERSATION_NOT_FOUND);
      mockApiClient.get.mockRejectedValue(error);

      await expect(
        conversationalAgent.conversations.getById(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID)
      ).rejects.toThrow(CONVERSATIONAL_AGENT_TEST_CONSTANTS.ERROR_CONVERSATION_NOT_FOUND);
    });
  });

  describe('getAll', () => {
    it('should return all conversations without pagination options', async () => {
      const mockResponse = createMockTransformedConversationCollection();

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await conversationalAgent.conversations.getAll();

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.toSatisfy((fn: Function) => fn() === CONVERSATION_ENDPOINTS.LIST),
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        undefined
      );

      expect(result).toEqual(mockResponse);
    });

    it('should return paginated conversations when pagination options provided', async () => {
      const mockResponse = createMockTransformedConversationCollection(10, {
        totalCount: 50,
        hasNextPage: true,
        nextCursor: TEST_CONSTANTS.NEXT_CURSOR,
      });

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await conversationalAgent.conversations.getAll({ pageSize: TEST_CONSTANTS.PAGE_SIZE });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          pageSize: TEST_CONSTANTS.PAGE_SIZE
        })
      );

      expect(result).toEqual(mockResponse);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBe(TEST_CONSTANTS.NEXT_CURSOR);
    });

    it('should support sort option', async () => {
      const mockResponse = createMockTransformedConversationCollection();

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      await conversationalAgent.conversations.getAll({ sort: 'descending' as any });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          sort: 'descending'
        })
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(conversationalAgent.conversations.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('updateById', () => {
    it('should update conversation label successfully', async () => {
      const updatedLabel = 'Updated Label';
      const mockConversation = createMockRawConversation({ label: updatedLabel });
      mockApiClient.patch.mockResolvedValue(mockConversation);

      const result = await conversationalAgent.conversations.updateById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        { label: updatedLabel }
      );

      expect(result).toBeDefined();
      expect(result.label).toBe(updatedLabel);
      expect(result.id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID);

      // Verify the correct endpoint and payload
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        CONVERSATION_ENDPOINTS.UPDATE(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID),
        { label: updatedLabel },
        expect.any(Object)
      );
    });

    it('should update autogenerateLabel', async () => {
      const mockConversation = createMockRawConversation({ autogenerateLabel: false });
      mockApiClient.patch.mockResolvedValue(mockConversation);

      const result = await conversationalAgent.conversations.updateById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        { autogenerateLabel: false }
      );

      expect(result.autogenerateLabel).toBe(false);
    });

    it('should transform fields in response', async () => {
      const mockConversation = createMockRawConversation();
      mockApiClient.patch.mockResolvedValue(mockConversation);

      const result = await conversationalAgent.conversations.updateById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        { label: 'test' }
      );

      // Verify transformation happened
      expect(result.id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID);
      expect(result.createdTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT);
      expect((result as any).conversationId).toBeUndefined();
    });

    it('should add methods to updated conversation', async () => {
      const mockConversation = createMockRawConversation();
      mockApiClient.patch.mockResolvedValue(mockConversation);

      const result = await conversationalAgent.conversations.updateById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        { label: 'test' }
      );

      expect(typeof result.update).toBe('function');
      expect(typeof result.delete).toBe('function');
    });

    it('should handle API errors', async () => {
      const error = createMockError(CONVERSATIONAL_AGENT_TEST_CONSTANTS.ERROR_CONVERSATION_NOT_FOUND);
      mockApiClient.patch.mockRejectedValue(error);

      await expect(
        conversationalAgent.conversations.updateById(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID, { label: 'test' })
      ).rejects.toThrow(CONVERSATIONAL_AGENT_TEST_CONSTANTS.ERROR_CONVERSATION_NOT_FOUND);
    });
  });

  describe('deleteById', () => {
    it('should delete conversation successfully', async () => {
      const mockConversation = createMockRawConversation();
      mockApiClient.delete.mockResolvedValue(mockConversation);

      const result = await conversationalAgent.conversations.deleteById(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID);

      expect(result).toBeDefined();

      // Verify the correct endpoint
      expect(mockApiClient.delete).toHaveBeenCalledWith(
        CONVERSATION_ENDPOINTS.DELETE(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID),
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(CONVERSATIONAL_AGENT_TEST_CONSTANTS.ERROR_CONVERSATION_NOT_FOUND);
      mockApiClient.delete.mockRejectedValue(error);

      await expect(
        conversationalAgent.conversations.deleteById(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID)
      ).rejects.toThrow(CONVERSATIONAL_AGENT_TEST_CONSTANTS.ERROR_CONVERSATION_NOT_FOUND);
    });
  });

  describe('uploadAttachment', () => {
    let mockFetch: any;

    beforeEach(() => {
      mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK'
      });
      global.fetch = mockFetch;
    });

    it('should upload attachment successfully (two-step process)', async () => {
      const mockAttachmentCreate = createMockAttachmentCreateResponse();
      mockApiClient.post.mockResolvedValue(mockAttachmentCreate);

      const mockFile = new File(['file contents'], 'document.pdf', { type: 'application/pdf' });

      const result = await conversationalAgent.conversations.uploadAttachment(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        mockFile
      );

      // Step 1: Verify createAttachment API call
      expect(mockApiClient.post).toHaveBeenCalledWith(
        ATTACHMENT_ENDPOINTS.CREATE(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID),
        { name: 'document.pdf' },
        expect.any(Object)
      );

      // Step 2: Verify file upload to blob storage
      expect(mockFetch).toHaveBeenCalledWith(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.ATTACHMENT_UPLOAD_URL,
        expect.objectContaining({
          method: CONVERSATIONAL_AGENT_TEST_CONSTANTS.ATTACHMENT_UPLOAD_VERB,
          body: mockFile,
          headers: expect.objectContaining({
            'Content-Type': 'application/pdf',
            'x-ms-blob-type': 'BlockBlob'
          })
        })
      );

      // Verify result
      expect(result).toEqual({
        uri: CONVERSATIONAL_AGENT_TEST_CONSTANTS.ATTACHMENT_URI,
        name: CONVERSATIONAL_AGENT_TEST_CONSTANTS.ATTACHMENT_NAME,
        mimeType: 'application/pdf'
      });
    });

    it('should handle different file types', async () => {
      const mockAttachmentCreate = createMockAttachmentCreateResponse({ name: 'image.png' });
      mockApiClient.post.mockResolvedValue(mockAttachmentCreate);

      const mockFile = new File(['image data'], 'image.png', { type: 'image/png' });

      const result = await conversationalAgent.conversations.uploadAttachment(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        mockFile
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'image/png'
          })
        })
      );

      expect(result.mimeType).toBe('image/png');
      expect(result.name).toBe('image.png');
    });

    it('should add auth header when requiresAuth is true', async () => {
      const mockAttachmentCreate = createMockAttachmentCreateResponse();
      mockApiClient.post.mockResolvedValue(mockAttachmentCreate);

      const mockFile = new File(['data'], 'doc.pdf', { type: 'application/pdf' });

      await conversationalAgent.conversations.uploadAttachment(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        mockFile
      );

      // Verify Authorization header is included
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer ')
          })
        })
      );
    });

    it('should not add auth header when requiresAuth is false', async () => {
      const mockAttachmentCreate = createMockAttachmentCreateResponse({
        fileUploadAccess: {
          url: CONVERSATIONAL_AGENT_TEST_CONSTANTS.ATTACHMENT_UPLOAD_URL,
          verb: 'PUT',
          requiresAuth: false,
          headers: { keys: [], values: [] }
        }
      });
      mockApiClient.post.mockResolvedValue(mockAttachmentCreate);

      const mockFile = new File(['data'], 'doc.pdf', { type: 'application/pdf' });

      await conversationalAgent.conversations.uploadAttachment(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        mockFile
      );

      // Verify Authorization header is NOT included
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].headers).not.toHaveProperty('Authorization');
    });

    it('should throw NetworkError when upload fails', async () => {
      const mockAttachmentCreate = createMockAttachmentCreateResponse();
      mockApiClient.post.mockResolvedValue(mockAttachmentCreate);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      });

      const mockFile = new File(['data'], 'doc.pdf', { type: 'application/pdf' });

      await expect(
        conversationalAgent.conversations.uploadAttachment(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID, mockFile)
      ).rejects.toThrow('Failed to upload to file storage: 403 Forbidden');
    });

    it('should merge custom headers from fileUploadAccess', async () => {
      const mockAttachmentCreate = createMockAttachmentCreateResponse({
        fileUploadAccess: {
          url: 'https://storage.example.com/upload',
          verb: 'POST',
          requiresAuth: false,
          headers: {
            keys: ['x-custom-header', 'x-another-header'],
            values: ['custom-value', 'another-value']
          }
        }
      });
      mockApiClient.post.mockResolvedValue(mockAttachmentCreate);

      const mockFile = new File(['data'], 'test.txt', { type: 'text/plain' });

      await conversationalAgent.conversations.uploadAttachment(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        mockFile
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://storage.example.com/upload',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'text/plain',
            'x-custom-header': 'custom-value',
            'x-another-header': 'another-value'
          })
        })
      );
    });
  });

  describe('connection properties', () => {
    it('should expose connectionStatus', () => {
      expect(conversationalAgent.conversations.connectionStatus).toBeDefined();
    });

    it('should expose isConnected', () => {
      expect(typeof conversationalAgent.conversations.isConnected).toBe('boolean');
    });

    it('should expose connectionError', () => {
      expect(conversationalAgent.conversations.connectionError).toBeNull();
    });

    it('should register connection status handler', () => {
      const handler = vi.fn();
      const cleanup = conversationalAgent.conversations.onConnectionStatusChanged(handler);

      expect(cleanup).toBeDefined();
      expect(typeof cleanup).toBe('function');
    });
  });
});
