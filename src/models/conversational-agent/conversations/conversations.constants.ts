/**
 * Constants for Conversational Agent
 */

/**
 * Constant for the conversation event name used in WebSocket communication.
 */
export const ConversationEventName = 'ConversationEvent';

/**
 * Common field mappings shared across all entities
 */
export const CommonFieldMap: { [key: string]: string } = {
  createdAt: 'createdTime',
  updatedAt: 'updatedTime'
};

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
