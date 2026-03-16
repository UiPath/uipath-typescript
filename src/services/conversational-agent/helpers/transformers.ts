/**
 * Transformers for Conversational Agent Service
 *
 * Transform API responses to use helper classes and SDK naming conventions.
 */

import type { Exchange, Message, ExchangeGetResponse, MessageGetResponse } from '@/models/conversational-agent';
import { ExchangeMap, MessageMap } from '@/models/conversational-agent';
import { transformData } from '@/utils/transform';
import { ContentPartHelper } from './content-part-helper';

/**
 * Transform an array of exchanges to use helper classes
 *
 * @internal
 * @param exchanges - Raw exchange data from the API
 * @returns Transformed exchanges with helper classes and SDK naming conventions
 */
export function transformExchanges(exchanges: Exchange[]): ExchangeGetResponse[] {
  return exchanges.map(exchange => transformExchange(exchange));
}

/**
 * Transform a single exchange to use helper classes and SDK naming conventions
 *
 * @internal
 * @param exchange - Raw exchange data from the API
 * @returns Transformed exchange with helper classes and SDK naming conventions
 */
export function transformExchange(exchange: Exchange): ExchangeGetResponse {
  const transformed = transformData(exchange, ExchangeMap) as Exchange;
  const { messages, ...rest } = transformed;
  return {
    ...rest,
    id: transformed.exchangeId,
    messages: messages.map(message => transformMessage(message))
  };
}

/**
 * Transform a message to use helper classes and SDK naming conventions
 *
 * @internal
 * @param message - Raw message data from the API
 * @returns Transformed message with helper classes and SDK naming conventions
 */
export function transformMessage(message: Message): MessageGetResponse {
  const transformed = transformData(message, MessageMap) as Message;
  const { contentParts, toolCalls, interrupts, ...rest } = transformed;
  return {
    ...rest,
    id: transformed.messageId,
    contentParts: contentParts?.map(cp => new ContentPartHelper(cp)),
    toolCalls: (toolCalls ?? []).map(tc => ({ ...tc, id: tc.toolCallId })),
    interrupts: (interrupts ?? []).map(i => ({ ...i, id: i.interruptId }))
  };
}
