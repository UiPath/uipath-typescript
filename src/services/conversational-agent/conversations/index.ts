/**
 * Conversation Service Module
 *
 * Exports the ConversationService and related operation services.
 */

// Main service
export { ConversationService as Conversations, ConversationService } from './conversations';

// Operation services (for standalone use)
export { ExchangeService as Exchanges, ExchangeService } from './exchanges';
export { MessageService as Messages, MessageService } from './messages';
export { AttachmentService as Attachments, AttachmentService } from './attachments';
