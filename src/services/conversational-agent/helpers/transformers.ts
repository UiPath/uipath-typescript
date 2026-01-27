/**
 * Transformers for Conversational Agent Service
 *
 * Transform API responses to use helper classes for convenience.
 */

import type { Exchange, Message } from '@/models/conversational-agent';
import { ContentPartHelper } from './content-part-helper';

/**
 * Exchange with ContentPartHelper instead of raw ContentPart
 */
export interface ExchangeWithHelpers extends Omit<Exchange, 'messages'> {
  messages: MessageWithHelpers[];
}

/**
 * Message with ContentPartHelper instead of raw ContentPart
 */
export interface MessageWithHelpers extends Omit<Message, 'contentParts'> {
  contentParts?: ContentPartHelper[];
}

/**
 * Transform an array of exchanges to use helper classes
 */
export function transformExchanges(exchanges: Exchange[]): ExchangeWithHelpers[] {
  return exchanges.map(exchange => transformExchange(exchange));
}

/**
 * Transform a single exchange to use helper classes
 */
export function transformExchange(exchange: Exchange): ExchangeWithHelpers {
  const { messages, ...rest } = exchange;
  return {
    ...rest,
    messages: messages.map(message => transformMessage(message))
  };
}

/**
 * Transform a message to use helper classes
 */
export function transformMessage(message: Message): MessageWithHelpers {
  const { contentParts, ...rest } = message;
  return {
    ...rest,
    contentParts: contentParts?.map(cp => new ContentPartHelper(cp))
  };
}
