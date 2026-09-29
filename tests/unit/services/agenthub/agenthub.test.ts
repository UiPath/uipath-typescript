// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentHubService } from '@/services/agenthub/agenthub';
import { ValidationError } from '@/core/errors';
import { ApiClient } from '@/core/http/api-client';
import { AGENTHUB_ENDPOINTS } from '@/utils/constants/endpoints';
import { LLM_GATEWAY_MODEL_NAME } from '@/utils/constants/headers';
import {
  AgentHubMessageRole,
  AgentHubToolType,
  type AgentHubChatCompletionRequest,
  type AgentHubChatCompletionResponse,
} from '@/models/agenthub/agenthub.types';
import { createMockError, TEST_CONSTANTS } from '@tests/utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '@tests/utils/setup';

// ===== MOCKING =====
vi.mock('@/core/http/api-client');

// ===== TEST CONSTANTS =====
const MODEL = 'gpt-4.1-2025-04-14';

const REQUEST: AgentHubChatCompletionRequest = {
  model: MODEL,
  messages: [{ role: AgentHubMessageRole.User, content: 'Summarize this invoice.' }],
  maxTokens: 2048,
  temperature: 0.7,
};

const WIRE_REQUEST = {
  model: MODEL,
  messages: [{ role: 'user', content: 'Summarize this invoice.' }],
  max_tokens: 2048,
  temperature: 0.7,
};

const WIRE_RESPONSE = {
  id: 'chatcmpl-123',
  choices: [
    {
      index: 0,
      message: { role: 'assistant', content: 'Invoice total: $100.' },
      finish_reason: 'stop',
    },
  ],
};

const RESPONSE: AgentHubChatCompletionResponse = {
  id: 'chatcmpl-123',
  choices: [
    {
      index: 0,
      message: { role: AgentHubMessageRole.Assistant, content: 'Invoice total: $100.' },
      finishReason: 'stop',
    },
  ],
};

// ===== TEST SUITE =====
describe('AgentHubService Unit Tests', () => {
  let service: AgentHubService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

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
      mockApiClient.post.mockResolvedValue(WIRE_RESPONSE);

      const result = await service.createChatCompletion(REQUEST);

      expect(result).toEqual(RESPONSE);
      expect(result.choices[0]?.message.content).toBe('Invoice total: $100.');
    });

    it('should POST snake_case fields and map snake_case response fields', async () => {
      mockApiClient.post.mockResolvedValue(WIRE_RESPONSE);

      const result = await service.createChatCompletion(REQUEST);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTHUB_ENDPOINTS.CREATE_CHAT_COMPLETION,
        WIRE_REQUEST,
        expect.objectContaining({
          headers: { [LLM_GATEWAY_MODEL_NAME]: MODEL },
        }),
      );
      const body = mockApiClient.post.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(body.maxTokens).toBeUndefined();
      expect(result.choices[0]?.finishReason).toBe('stop');
      expect((result.choices[0] as Record<string, unknown>).finish_reason).toBeUndefined();
    });

    it('should leave tool parameter schema keys unchanged', async () => {
      mockApiClient.post.mockResolvedValue(WIRE_RESPONSE);
      const tools = [
        {
          type: AgentHubToolType.Function,
          function: {
            name: 'lookupInvoice',
            parameters: { invoiceId: { type: 'string' } },
          },
        },
      ];

      await service.createChatCompletion({ ...REQUEST, tools });

      const body = mockApiClient.post.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(body.tools).toEqual(tools);
    });

    it('should forward an abort signal', async () => {
      mockApiClient.post.mockResolvedValue(WIRE_RESPONSE);
      const controller = new AbortController();

      await service.createChatCompletion(REQUEST, { signal: controller.signal });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        WIRE_REQUEST,
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('should reject an empty model', async () => {
      await expect(
        service.createChatCompletion({ ...REQUEST, model: '' }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should reject empty messages', async () => {
      await expect(
        service.createChatCompletion({ ...REQUEST, messages: [] }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should omit max_tokens when maxTokens is not set', async () => {
      mockApiClient.post.mockResolvedValue(WIRE_RESPONSE);

      await service.createChatCompletion({
        model: REQUEST.model,
        messages: REQUEST.messages,
        temperature: REQUEST.temperature,
      });

      const body = mockApiClient.post.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(body.max_tokens).toBeUndefined();
      expect(body.maxTokens).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(service.createChatCompletion(REQUEST)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
