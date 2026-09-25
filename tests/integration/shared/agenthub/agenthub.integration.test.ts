import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, describeIntegration, InitMode } from '../../config/unified-setup';
import { AgentHub } from '../../../../src/services/agenthub';
import {
  AgentHubMessageRole,
  type AgentHubChatCompletionRequest,
} from '../../../../src/models/agenthub/agenthub.types';

/**
 * Integration tests for AgentHub chat completions (`/agenthub_/llm/api/*`).
 *
 * Run with:
 *   npx vitest run tests/integration/shared/agenthub/agenthub.integration.test.ts --config vitest.integration.config.ts
 */

const modes: InitMode[] = ['v1'];

const REQUEST: AgentHubChatCompletionRequest = {
  model: 'gpt-4.1-2025-04-14',
  messages: [{ role: AgentHubMessageRole.User, content: 'Reply with the word ok.' }],
  maxTokens: 16,
  temperature: 0,
};

// agenthub_ rejects PAT tokens entirely (401 regardless of scopes), so this
// suite authenticates with a user token and skips when one is not configured.
describeIntegration('AgentHub - Integration Tests', 'user', modes, () => {
  let agentHub!: AgentHub;

  beforeAll(() => {
    const service = getServices().agentHub;
    if (!service) {
      throw new Error('AgentHub service is not registered for this init mode');
    }
    agentHub = service;
  });

  describe('createChatCompletion', () => {
    it('should return a completion with an assistant choice', async () => {
      const result = await agentHub.createChatCompletion(REQUEST);

      expect(result).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(Array.isArray(result.choices)).toBe(true);
      if (result.choices.length === 0) {
        throw new Error(
          'Chat completion returned no choices — cannot verify response shape.',
        );
      }

      const choice = result.choices[0];
      expect(typeof choice.index).toBe('number');
      expect(typeof choice.message.role).toBe('string');
      expect(typeof choice.message.content).toBe('string');
      expect((choice as Record<string, unknown>).finish_reason).toBeUndefined();
      if (choice.finishReason != null) {
        expect(typeof choice.finishReason).toBe('string');
      }
    });
  });
});
