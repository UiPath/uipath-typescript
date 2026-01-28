/**
 * Constants for Conversational Agent
 */

/**
 * Constant for the conversation event name used in WebSocket communication.
 */
export const ConversationEventName = 'ConversationEvent';

/**
 * Maps fields for Conversation entities to ensure consistent SDK naming
 */
export const ConversationMap: { [key: string]: string } = {
  createdAt: 'createdTime',
  updatedAt: 'updatedTime',
  lastActivityAt: 'lastActivityTime'
};
