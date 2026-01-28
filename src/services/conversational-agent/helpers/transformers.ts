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
 */
export function transformExchanges(exchanges: Exchange[]): ExchangeGetResponse[] {
  return exchanges.map(exchange => transformExchange(exchange));
}

/**
 * Transform a single exchange to use helper classes and SDK naming conventions
 */
export function transformExchange(exchange: Exchange): ExchangeGetResponse {
  // First transform timestamps at exchange level
  const transformed = transformData(exchange, ExchangeMap) as Exchange;
  const { messages, ...rest } = transformed;
  return {
    ...rest,
    messages: messages.map(message => transformMessage(message))
  };
}

/**
 * Transform a message to use helper classes and SDK naming conventions
 */
export function transformMessage(message: Message): MessageGetResponse {
  // First transform timestamps at message level (also transforms nested contentParts, toolCalls, etc.)
  const transformed = transformData(message, MessageMap) as Message;
  const { contentParts, ...rest } = transformed;
  return {
    ...rest,
    contentParts: contentParts?.map(cp => new ContentPartHelper(cp))
  };
}
