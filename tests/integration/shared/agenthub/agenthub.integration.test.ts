import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, describeIntegration, InitMode } from '../../config/unified-setup';
import { AgentHub } from '../../../../src/services/agenthub';
import {
  AgentHubMessageRole,
  AgentHubToolChoiceType,
  AgentHubToolType,
  type AgentHubChatCompletionResponse,
  type AgentHubChatMessage,
  type AgentHubChatTool,
} from '../../../../src/models/agenthub/agenthub.types';

/**
 * Integration tests for AgentHub chat completions (`/agenthub_/llm/api/*`).
 *
 * Run with:
 *   npx vitest run tests/integration/shared/agenthub/agenthub.integration.test.ts --config vitest.integration.config.ts
 */

const modes: InitMode[] = ['v1'];

const MODEL = 'gpt-4.1-2025-04-14';
const TOOL_NAME = 'lookupInvoice';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const TOOLS: AgentHubChatTool[] = [
  {
    type: AgentHubToolType.Function,
    function: {
      name: TOOL_NAME,
      description: 'Fetches an invoice by its identifier.',
      parameters: {
        type: 'object',
        properties: { invoice_id: { type: 'string', description: 'Invoice identifier, e.g. INV-42' } },
        required: ['invoice_id'],
      },
    },
  },
];

// agenthub_ rejects PAT tokens entirely (401 regardless of scopes), so this
// suite authenticates with a user token and skips when one is not configured.
describeIntegration('AgentHub - Integration Tests', 'user', modes, () => {
  let agentHub!: AgentHub;
  let completion!: AgentHubChatCompletionResponse;

  beforeAll(async () => {
    const service = getServices().agentHub;
    if (!service) {
      throw new Error('AgentHub service is not registered for this init mode');
    }
    agentHub = service;

    completion = await agentHub.createChatCompletion(
      MODEL,
      [{ role: AgentHubMessageRole.User, content: 'Reply with the word ok.' }],
      { maxTokens: 16, temperature: 0 },
    );
  });

  describe('createChatCompletion', () => {
    it('should return a completion with an assistant choice and token usage', () => {
      expect(typeof completion.id).toBe('string');
      expect(typeof completion.object).toBe('string');
      expect(typeof completion.model).toBe('string');
      if (completion.choices.length === 0) {
        throw new Error('Chat completion returned no choices — cannot verify response shape.');
      }

      const choice = completion.choices[0];
      expect(typeof choice.index).toBe('number');
      expect(choice.message.role).toBe(AgentHubMessageRole.Assistant);
      expect(typeof choice.message.content).toBe('string');
      if (choice.finishReason != null) {
        expect(typeof choice.finishReason).toBe('string');
      }
      expect(typeof completion.usage.promptTokens).toBe('number');
      expect(typeof completion.usage.completionTokens).toBe('number');
      expect(typeof completion.usage.totalTokens).toBe('number');
    });

    it('should convert wire fields to SDK names and drop the originals', () => {
      expect(Math.abs(Date.parse(completion.createdTime) - Date.now())).toBeLessThan(ONE_DAY_MS);
      expect(completion).not.toHaveProperty('created');
      expect(completion.usage).not.toHaveProperty('prompt_tokens');
      expect(completion.choices[0]).not.toHaveProperty('finish_reason');
    });

    it('should call a forced tool and accept the tool result', async () => {
      const messages: AgentHubChatMessage[] = [
        { role: AgentHubMessageRole.User, content: 'Look up invoice INV-42.' },
      ];

      const first = await agentHub.createChatCompletion(MODEL, messages, {
        tools: TOOLS,
        toolChoice: { type: AgentHubToolChoiceType.Tool, name: TOOL_NAME },
        temperature: 0,
      });

      const assistant = first.choices[0].message;
      const toolCalls = assistant.toolCalls ?? [];
      if (toolCalls.length === 0) {
        throw new Error('Forced tool choice produced no tool call — cannot verify tool-call mapping.');
      }
      const call = toolCalls[0];
      expect(typeof call.id).toBe('string');
      expect(call.name).toBe(TOOL_NAME);
      // Argument keys follow the tool schema, not the SDK's camelCase convention.
      expect(call.arguments).toHaveProperty('invoice_id');
      expect(assistant).not.toHaveProperty('tool_calls');

      const second = await agentHub.createChatCompletion(
        MODEL,
        [
          ...messages,
          assistant,
          {
            role: AgentHubMessageRole.Tool,
            toolCallId: call.id,
            content: JSON.stringify({ invoiceId: 'INV-42', total: 100 }),
          },
        ],
        { tools: TOOLS, maxTokens: 64, temperature: 0 },
      );

      const answer = second.choices[0].message;
      expect(typeof answer.content).toBe('string');
      expect(answer.content).not.toBe('');
    });
  });
});
