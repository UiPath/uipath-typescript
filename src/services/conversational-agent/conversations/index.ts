/**
 * Conversations Service Module
 *
 * Exports the Conversations service and related operation services.
 */

// Main service
export { Conversations } from './conversations';

// Operation services (for standalone use or testing)
export { ExchangeOperations } from './exchanges';
export { MessageOperations } from './messages';
export { AttachmentOperations, type InitializeFileOutput } from './attachments';
