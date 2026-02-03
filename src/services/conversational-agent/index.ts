/**
 * Conversational Agent Service Module
 *
 * Provides conversational AI capabilities through:
 * - ConversationalAgent: Agent listing and access to conversations
 * - Conversations: Conversation management with HTTP CRUD and real-time WebSocket support
 * - Exchanges: Exchange operations (HTTP)
 * - Messages: Message operations (HTTP)
 * - Attachments: Attachment operations (HTTP)
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { ConversationalAgent, Conversations } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const agent = new ConversationalAgent(sdk);
 *
 * // List available agents
 * const agents = await agent.getAll();
 *
 * // Create a conversation
 * const conversation = await agent.conversations.create({
 *   agentReleaseId: agents[0].id,
 *   folderId: agents[0].folderId
 * });
 *
 * // Start real-time chat session
 * const session = agent.conversations.startSession({ conversationId: conversation.id });
 * session.onExchangeStart((exchange) => {
 *   exchange.onMessageStart((message) => {
 *     message.onContentPartStart((part) => {
 *       part.onTextDelta((delta) => console.log(delta.text));
 *     });
 *   });
 * });
 *
 * // Send a message
 * session.sendPrompt({ text: 'Hello!' });
 *
 * // Disconnect when done
 * agent.conversations.disconnect();
 * ```
 *
 * @module
 */

// Main entry point
export { ConversationalAgentService as ConversationalAgent, ConversationalAgentService } from './conversational-agent';

// Services (for standalone usage)
export { ConversationService as Conversations, ConversationService } from './conversations';
export { Exchanges, ExchangeService, Messages, MessageService, Attachments, AttachmentService } from './conversations';
export { User, UserService } from './user';

// ==================== Models ====================
// Re-export all types: ID types, model types, request/response types, event types, etc.
export * from '@/models/conversational-agent';

// ==================== Event Helpers ====================
// Re-export all helpers: event helper classes, handler types, error types, etc.
export * from './helpers';
