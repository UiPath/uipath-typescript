/**
 * Conversation Service Module
 *
 * Exports the ConversationService and related operation services.
 */

// Main service
export { ConversationService as Conversations, ConversationService } from './conversations';

// Operation services (for standalone use or testing)
export { ExchangeService as ExchangeOperations, ExchangeService } from './exchanges';
export { MessageService as MessageOperations, MessageService } from './messages';
export { AttachmentService as AttachmentOperations, AttachmentService } from './attachments';
