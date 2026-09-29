// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentHubService } from '@/services/agenthub/agenthub';
import { ValidationError } from '@/core/errors';
import { ApiClient } from '@/core/http/api-client';
import { AGENTHUB_ENDPOINTS } from '@/utils/constants/endpoints';
import { LLM_GATEWAY_MODEL_NAME } from '@/utils/constants/headers';
import {
  AgentHubMessageRole,
  AgentHubToolChoiceType,
  AgentHubToolType,
  type AgentHubChatCompletionResponse,
  type AgentHubChatMessage,
  type AgentHubChatTool,
  type AgentHubNamedToolChoice,
} from '@/models/agenthub/agenthub.types';
import type { RawAgentHubChatCompletionResponse } from '@/models/agenthub/agenthub.internal-types';
import { createMockError } from '@tests/utils/mocks';
import { AGENTHUB_TEST_CONSTANTS } from '@tests/utils/constants';
import { createServiceTestDependencies, createMockApiClient } from '@tests/utils/setup';

// ===== MOCKING =====
vi.mock('@/core/http/api-client');

// ===== TEST FIXTURES =====
const MESSAGES: AgentHubChatMessage[] = [
  { role: AgentHubMessageRole.User, content: AGENTHUB_TEST_CONSTANTS.PROMPT },
];
const WIRE_MESSAGES = [{ role: 'user', content: AGENTHUB_TEST_CONSTANTS.PROMPT }];

const TOOLS: AgentHubChatTool[] = [
  {
    type: AgentHubToolType.Function,
    function: {
      name: AGENTHUB_TEST_CONSTANTS.TOOL_NAME,
      parameters: {
        type: 'object',
        properties: { invoice_id: { type: 'string' } },
        required: ['invoice_id'],
      },
    },
  },
];

const TOOL_CHOICE: AgentHubNamedToolChoice = {
  type: AgentHubToolChoiceType.Tool,
  name: AGENTHUB_TEST_CONSTANTS.TOOL_NAME,
};

const WIRE_TOOL_CALL = {
  id: AGENTHUB_TEST_CONSTANTS.TOOL_CALL_ID,
  name: AGENTHUB_TEST_CONSTANTS.TOOL_NAME,
  arguments: AGENTHUB_TEST_CONSTANTS.TOOL_ARGUMENTS,
};

const WIRE_RESPONSE: RawAgentHubChatCompletionResponse = {
  id: AGENTHUB_TEST_CONSTANTS.COMPLETION_ID,
  object: AGENTHUB_TEST_CONSTANTS.OBJECT,
  created: AGENTHUB_TEST_CONSTANTS.CREATED,
  model: AGENTHUB_TEST_CONSTANTS.MODEL,
  choices: [
    {
      index: 0,
      message: { role: AgentHubMessageRole.Assistant, content: AGENTHUB_TEST_CONSTANTS.COMPLETION_TEXT },
      finish_reason: AGENTHUB_TEST_CONSTANTS.FINISH_REASON,
    },
  ],
  usage: {
    prompt_tokens: AGENTHUB_TEST_CONSTANTS.PROMPT_TOKENS,
    completion_tokens: AGENTHUB_TEST_CONSTANTS.COMPLETION_TOKENS,
    total_tokens: AGENTHUB_TEST_CONSTANTS.TOTAL_TOKENS,
  },
};

const WIRE_TOOL_CALL_RESPONSE: RawAgentHubChatCompletionResponse = {
  ...WIRE_RESPONSE,
  choices: [
    {
      index: 0,
      message: { role: AgentHubMessageRole.Assistant, content: null, tool_calls: [WIRE_TOOL_CALL] },
      finish_reason: AGENTHUB_TEST_CONSTANTS.FINISH_REASON_TOOL_CALLS,
    },
  ],
};

const RESPONSE: AgentHubChatCompletionResponse = {
  id: AGENTHUB_TEST_CONSTANTS.COMPLETION_ID,
  object: AGENTHUB_TEST_CONSTANTS.OBJECT,
  model: AGENTHUB_TEST_CONSTANTS.MODEL,
  createdTime: AGENTHUB_TEST_CONSTANTS.CREATED_TIME,
  choices: [
    {
      index: 0,
      message: { role: AgentHubMessageRole.Assistant, content: AGENTHUB_TEST_CONSTANTS.COMPLETION_TEXT },
      finishReason: AGENTHUB_TEST_CONSTANTS.FINISH_REASON,
    },
  ],
  usage: {
    promptTokens: AGENTHUB_TEST_CONSTANTS.PROMPT_TOKENS,
    completionTokens: AGENTHUB_TEST_CONSTANTS.COMPLETION_TOKENS,
    totalTokens: AGENTHUB_TEST_CONSTANTS.TOTAL_TOKENS,
  },
};

// ===== TEST SUITE =====
describe('AgentHubService Unit Tests', () => {
  let service: AgentHubService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  const requestBody = () => mockApiClient.post.mock.calls[0]?.[1] as Record<string, unknown>;

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
    it('should return the mapped chat completion', async () => {
      mockApiClient.post.mockResolvedValue(WIRE_RESPONSE);

      const result = await service.createChatCompletion(AGENTHUB_TEST_CONSTANTS.MODEL, MESSAGES);

      expect(result).toEqual(RESPONSE);
    });

    it('should convert snake_case wire fields and drop the originals', async () => {
      mockApiClient.post.mockResolvedValue(WIRE_RESPONSE);

      const result = await service.createChatCompletion(AGENTHUB_TEST_CONSTANTS.MODEL, MESSAGES);

      expect(result.createdTime).toBe(AGENTHUB_TEST_CONSTANTS.CREATED_TIME);
      expect(result.usage.promptTokens).toBe(AGENTHUB_TEST_CONSTANTS.PROMPT_TOKENS);
      expect(result.choices[0].finishReason).toBe(AGENTHUB_TEST_CONSTANTS.FINISH_REASON);
      expect(result).not.toHaveProperty('created');
      expect(result.usage).not.toHaveProperty('prompt_tokens');
      expect(result.choices[0]).not.toHaveProperty('finish_reason');
    });

    it('should POST snake_case generation params with the model header and no model in the body', async () => {
      mockApiClient.post.mockResolvedValue(WIRE_RESPONSE);

      await service.createChatCompletion(AGENTHUB_TEST_CONSTANTS.MODEL, MESSAGES, {
        maxTokens: AGENTHUB_TEST_CONSTANTS.MAX_TOKENS,
        temperature: AGENTHUB_TEST_CONSTANTS.TEMPERATURE,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENTHUB_ENDPOINTS.CREATE_CHAT_COMPLETION,
        {
          messages: WIRE_MESSAGES,
          max_tokens: AGENTHUB_TEST_CONSTANTS.MAX_TOKENS,
          temperature: AGENTHUB_TEST_CONSTANTS.TEMPERATURE,
        },
        expect.objectContaining({
          headers: { [LLM_GATEWAY_MODEL_NAME]: AGENTHUB_TEST_CONSTANTS.MODEL },
        }),
      );
      expect(requestBody().maxTokens).toBeUndefined();
      expect(requestBody().model).toBeUndefined();
    });

    it('should omit max_tokens when maxTokens is not set', async () => {
      mockApiClient.post.mockResolvedValue(WIRE_RESPONSE);

      await service.createChatCompletion(AGENTHUB_TEST_CONSTANTS.MODEL, MESSAGES, {
        temperature: AGENTHUB_TEST_CONSTANTS.TEMPERATURE,
      });

      expect(requestBody().max_tokens).toBeUndefined();
      expect(requestBody().maxTokens).toBeUndefined();
    });

    it('should forward tools and toolChoice verbatim', async () => {
      mockApiClient.post.mockResolvedValue(WIRE_TOOL_CALL_RESPONSE);

      await service.createChatCompletion(AGENTHUB_TEST_CONSTANTS.MODEL, MESSAGES, {
        tools: TOOLS,
        toolChoice: TOOL_CHOICE,
      });

      expect(requestBody().tools).toEqual(TOOLS);
      expect(requestBody().tool_choice).toEqual(TOOL_CHOICE);
      expect(requestBody().toolChoice).toBeUndefined();
    });

    it('should map response tool calls and keep argument keys unchanged', async () => {
      mockApiClient.post.mockResolvedValue(WIRE_TOOL_CALL_RESPONSE);

      const result = await service.createChatCompletion(AGENTHUB_TEST_CONSTANTS.MODEL, MESSAGES, {
        tools: TOOLS,
      });

      const message = result.choices[0].message;
      expect(message.content).toBeNull();
      expect(message.toolCalls).toEqual([WIRE_TOOL_CALL]);
      expect(message).not.toHaveProperty('tool_calls');
      expect(result.choices[0].finishReason).toBe(AGENTHUB_TEST_CONSTANTS.FINISH_REASON_TOOL_CALLS);
    });

    it('should send assistant tool calls and tool results in the normalized wire shape', async () => {
      mockApiClient.post.mockResolvedValue(WIRE_RESPONSE);
      const assistant: AgentHubChatMessage = {
        role: AgentHubMessageRole.Assistant,
        content: null,
        toolCalls: [WIRE_TOOL_CALL],
      };
      const toolResult: AgentHubChatMessage = {
        role: AgentHubMessageRole.Tool,
        toolCallId: AGENTHUB_TEST_CONSTANTS.TOOL_CALL_ID,
        content: AGENTHUB_TEST_CONSTANTS.TOOL_RESULT,
      };

      await service.createChatCompletion(
        AGENTHUB_TEST_CONSTANTS.MODEL,
        [...MESSAGES, assistant, toolResult],
        { tools: TOOLS },
      );

      expect(requestBody().messages).toEqual([
        ...WIRE_MESSAGES,
        { role: 'assistant', content: '', tool_calls: [WIRE_TOOL_CALL] },
        {
          role: 'tool',
          content: {
            result: AGENTHUB_TEST_CONSTANTS.TOOL_RESULT,
            call_id: AGENTHUB_TEST_CONSTANTS.TOOL_CALL_ID,
          },
        },
      ]);
    });

    it('should reject a tool message without toolCallId', async () => {
      await expect(
        service.createChatCompletion(AGENTHUB_TEST_CONSTANTS.MODEL, [
          { role: AgentHubMessageRole.Tool, content: AGENTHUB_TEST_CONSTANTS.TOOL_RESULT },
        ]),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should forward an abort signal', async () => {
      mockApiClient.post.mockResolvedValue(WIRE_RESPONSE);
      const controller = new AbortController();

      await service.createChatCompletion(AGENTHUB_TEST_CONSTANTS.MODEL, MESSAGES, {
        signal: controller.signal,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        { messages: WIRE_MESSAGES },
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('should reject an empty model', async () => {
      await expect(service.createChatCompletion('', MESSAGES)).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should reject empty messages', async () => {
      await expect(
        service.createChatCompletion(AGENTHUB_TEST_CONSTANTS.MODEL, []),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should propagate API errors', async () => {
      const error = createMockError(AGENTHUB_TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        service.createChatCompletion(AGENTHUB_TEST_CONSTANTS.MODEL, MESSAGES),
      ).rejects.toThrow(AGENTHUB_TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
