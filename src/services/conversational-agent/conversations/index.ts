/**
 * Conversation Service Module
 *
 * Exports the ConversationService and related operation services.
 */

// Main service (used internally by ConversationalAgentService)
export { ConversationService } from './conversations';

// Operation services (for standalone use)
export { ExchangeService as Exchanges, ExchangeService } from './exchanges';
export { MessageService as Messages, MessageService } from './messages';
