/**
 * Constants for Conversational Agent
 */

import { CommonFieldMap } from '../common.constants';

/**
 * Constant for the conversation event name used in WebSocket communication.
 */
export const ConversationEventName = 'ConversationEvent';

/**
 * Maps fields for Conversation entity to ensure consistent SDK naming
 */
export const ConversationMap: { [key: string]: string } = {
  ...CommonFieldMap,
  conversationId: 'id',
  lastActivityAt: 'lastActivityTime'
};

/**
 * Maps fields for Exchange entity to ensure consistent SDK naming
 */
export const ExchangeMap: { [key: string]: string } = {
  ...CommonFieldMap
};

/**
 * Maps fields for Message entity to ensure consistent SDK naming
 */
export const MessageMap: { [key: string]: string } = {
  ...CommonFieldMap
};
