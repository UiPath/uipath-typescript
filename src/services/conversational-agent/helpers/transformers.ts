/**
 * Transformers for Conversational Agent Service
 *
 * Transform API responses to use helper classes and SDK naming conventions.
 */

import type { Exchange, Message } from '@/models/conversational-agent';
import { ConversationMap } from '@/models/conversational-agent';
import { transformData } from '@/utils/transform';
import { ContentPartGetResponse } from './content-part-helper';

/**
 * Response type for Exchange with ContentPartGetResponse instead of raw ContentPart
 */
export interface ExchangeGetResponse extends Omit<Exchange, 'messages'> {
  messages: MessageGetResponse[];
}

/**
 * Response type for Message with ContentPartGetResponse instead of raw ContentPart
 */
export interface MessageGetResponse extends Omit<Message, 'contentParts'> {
  contentParts?: ContentPartGetResponse[];
}

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
  const transformed = transformData(exchange, ConversationMap) as Exchange;
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
  const transformed = transformData(message, ConversationMap) as Message;
  const { contentParts, ...rest } = transformed;
  return {
    ...rest,
    contentParts: contentParts?.map(cp => new ContentPartGetResponse(cp))
  };
}
