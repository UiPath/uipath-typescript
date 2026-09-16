// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentHubService } from '@/services/agenthub/agenthub';
import { ApiClient } from '@/core/http/api-client';
import { AGENTHUB_ENDPOINTS } from '@/utils/constants/endpoints';
import { LLM_GATEWAY_MODEL_NAME } from '@/utils/constants/headers';
import type {
  AgentHubChatCompletionRequest,
  AgentHubChatCompletionResponse,
} from '@/models/agenthub/agenthub.types';
import { createMockError, TEST_CONSTANTS } from '@tests/utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '@tests/utils/setup';

// ===== MOCKING =====
vi.mock('@/core/http/api-client');

// ===== TEST CONSTANTS =====
const MODEL = 'gpt-4.1-2025-04-14';

const REQUEST: AgentHubChatCompletionRequest = {
  model: MODEL,
  messages: [{ role: 'user', content: 'Summarize this invoice.' }],
  maxTokens: 2048,
  temperature: 0.7,
};

const RESPONSE: AgentHubChatCompletionResponse = {
  id: 'chatcmpl-123',
  choices: [
    {
      index: 0,
      message: { role: 'assistant', content: 'Invoice total: $100.' },
      finishReason: 'stop',
    },
  ],
};

// ===== TEST SUITE =====
describe('AgentHubService Unit Tests', () => {
  let service: AgentHubService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });

    service = new AgentHubService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createChatCompletion', () => {
    it('should return the chat completion', async () => {
      mockApiClient.post.mockResolvedValue(RESPONSE);

      const result = await service.createChatCompletion(REQUEST);

      expect(result).toEqual(RESPONSE);
      expect(result.choices[0]?.message.content).toBe('Invoice total: $100.');
    });

    it('should POST to the chat completions endpoint with the gateway model header', async () => {
      mockApiClient.post.mockResolvedValue(RESPONSE);

      await service.createChatCompletion(REQUEST);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTHUB_ENDPOINTS.CREATE_CHAT_COMPLETION,
        REQUEST,
        expect.objectContaining({
          headers: { [LLM_GATEWAY_MODEL_NAME]: MODEL },
        }),
      );
    });

    it('should forward an abort signal', async () => {
      mockApiClient.post.mockResolvedValue(RESPONSE);
      const controller = new AbortController();

      await service.createChatCompletion(REQUEST, { signal: controller.signal });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        REQUEST,
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('should reject an empty model', async () => {
      await expect(
        service.createChatCompletion({ ...REQUEST, model: '' }),
      ).rejects.toThrow('model is required');
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should reject empty messages', async () => {
      await expect(service.createChatCompletion({ ...REQUEST, messages: [] })).rejects.toThrow(
        'messages must not be empty',
      );
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should propagate API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(service.createChatCompletion(REQUEST)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
