// ===== IMPORTS =====
import { describe, it, expect } from 'vitest';
import {
  transformExchange,
  transformExchanges,
  transformMessage,
} from '@/services/conversational-agent/helpers/transformers';
import { ContentPartHelper } from '@/services/conversational-agent/helpers/content-part-helper';
import {
  createMockRawMessage,
  createMockRawExchange,
  CONVERSATIONAL_AGENT_TEST_CONSTANTS,
} from '@tests/utils/mocks';

// ===== TEST SUITE =====
describe('Transformer Functions', () => {
  describe('transformMessage', () => {
    it('should add id alias from messageId', () => {
      const raw = createMockRawMessage();
      const result = transformMessage(raw);

      expect(result.id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID);
      expect(result.messageId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID);
    });

    it('should transform createdAt -> createdTime and updatedAt -> updatedTime', () => {
      const raw = createMockRawMessage();
      const result = transformMessage(raw);

      expect(result.createdTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT);
      expect(result.updatedTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT);
      expect((result as any).createdAt).toBeUndefined();
      expect((result as any).updatedAt).toBeUndefined();
    });

    it('should wrap content parts in ContentPartHelper', () => {
      const raw = createMockRawMessage();
      const result = transformMessage(raw);

      expect(result.contentParts).toHaveLength(1);
      expect(result.contentParts![0]).toBeInstanceOf(ContentPartHelper);
      expect(result.contentParts![0].contentPartId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONTENT_PART_ID);
      expect(result.contentParts![0].isDataInline).toBe(true);
    });

    it('should handle undefined content parts', () => {
      const raw = createMockRawMessage({ contentParts: undefined });
      const result = transformMessage(raw);

      expect(result.contentParts).toBeUndefined();
    });

    it('should add id alias to tool calls', () => {
      const raw = createMockRawMessage({
        toolCalls: [
          {
            toolCallId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.TOOL_CALL_ID,
            name: 'search',
            input: { query: 'test' },
            createdTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
            updatedTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
          }
        ]
      });
      const result = transformMessage(raw);

      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.TOOL_CALL_ID);
      expect(result.toolCalls[0].toolCallId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.TOOL_CALL_ID);
      expect(result.toolCalls[0].name).toBe('search');
    });

    it('should add id alias to interrupts', () => {
      const raw = createMockRawMessage({
        interrupts: [
          {
            interruptId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.INTERRUPT_ID,
            type: 'uipath_cas_tool_call_confirmation',
            interruptValue: { toolName: 'search' },
            createdTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
            updatedTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
          }
        ]
      });
      const result = transformMessage(raw);

      expect(result.interrupts).toHaveLength(1);
      expect(result.interrupts[0].id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.INTERRUPT_ID);
      expect(result.interrupts[0].interruptId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.INTERRUPT_ID);
      expect(result.interrupts[0].type).toBe('uipath_cas_tool_call_confirmation');
    });

    it('should coerce null toolCalls to empty array', () => {
      const raw = createMockRawMessage({ toolCalls: null });
      const result = transformMessage(raw);

      expect(result.toolCalls).toEqual([]);
    });

    it('should coerce null interrupts to empty array', () => {
      const raw = createMockRawMessage({ interrupts: null });
      const result = transformMessage(raw);

      expect(result.interrupts).toEqual([]);
    });

    it('should preserve role and spanId', () => {
      const raw = createMockRawMessage({ role: 'assistant', spanId: 'span-abc' });
      const result = transformMessage(raw);

      expect(result.role).toBe('assistant');
      expect(result.spanId).toBe('span-abc');
    });
  });

  describe('transformExchange', () => {
    it('should add id alias from exchangeId', () => {
      const raw = createMockRawExchange();
      const result = transformExchange(raw);

      expect(result.id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID);
      expect(result.exchangeId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID);
    });

    it('should transform createdAt -> createdTime and updatedAt -> updatedTime', () => {
      const raw = createMockRawExchange();
      const result = transformExchange(raw);

      expect(result.createdTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT);
      expect(result.updatedTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT);
      expect((result as any).createdAt).toBeUndefined();
      expect((result as any).updatedAt).toBeUndefined();
    });

    it('should transform all nested messages', () => {
      const raw = createMockRawExchange({
        messages: [
          createMockRawMessage({ messageId: 'msg-1', role: 'user' }),
          createMockRawMessage({ messageId: 'msg-2', role: 'assistant' }),
        ]
      });
      const result = transformExchange(raw);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].id).toBe('msg-1');
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[1].id).toBe('msg-2');
      expect(result.messages[1].role).toBe('assistant');
    });

    it('should wrap message content parts in ContentPartHelper', () => {
      const raw = createMockRawExchange();
      const result = transformExchange(raw);

      const contentPart = result.messages[0].contentParts![0];
      expect(contentPart).toBeInstanceOf(ContentPartHelper);
      expect(contentPart.isDataInline).toBe(true);
    });

    it('should handle exchange with empty messages', () => {
      const raw = createMockRawExchange({ messages: [] });
      const result = transformExchange(raw);

      expect(result.messages).toEqual([]);
    });

    it('should preserve spanId', () => {
      const raw = createMockRawExchange({ spanId: 'span-xyz' });
      const result = transformExchange(raw);

      expect(result.spanId).toBe('span-xyz');
    });
  });

  describe('transformExchanges', () => {
    it('should transform an array of exchanges', () => {
      const exchanges = [
        createMockRawExchange({ exchangeId: 'ex-1' }),
        createMockRawExchange({ exchangeId: 'ex-2' }),
        createMockRawExchange({ exchangeId: 'ex-3' }),
      ];
      const result = transformExchanges(exchanges);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('ex-1');
      expect(result[1].id).toBe('ex-2');
      expect(result[2].id).toBe('ex-3');
    });

    it('should handle empty array', () => {
      const result = transformExchanges([]);

      expect(result).toEqual([]);
    });

    it('should transform all nested messages in each exchange', () => {
      const exchanges = [
        createMockRawExchange({
          exchangeId: 'ex-1',
          messages: [
            createMockRawMessage({ messageId: 'msg-1' }),
            createMockRawMessage({ messageId: 'msg-2' }),
          ]
        }),
      ];
      const result = transformExchanges(exchanges);

      expect(result[0].messages).toHaveLength(2);
      expect(result[0].messages[0].id).toBe('msg-1');
      expect(result[0].messages[1].id).toBe('msg-2');
    });
  });
});
