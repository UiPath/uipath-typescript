/**
 * Conversational Agent Types
 *
 * This module exports all types for the Conversational Agent functionality.
 * Types are organized per service in subfolders, with cross-cutting types at root.
 */

// ==================== Cross-Cutting Types (Root Level) ====================
// Common types used across multiple services (IDs, enums, utility types)
export * from './conversations-shared.types';

// Core data models (Conversation, Exchange, Message, ContentPart)
export * from './conversations-api.types';

// Event types (WebSocket protocol)
export * from './conversations-events.types';

// Feature flags
export * from './feature-flags.types';

// ==================== Per-Service Types (Subfolders) ====================
// Agent service types and models
export * from './agents';

// Conversation service types and models (includes exchanges, attachments)
export * from './conversations';

// User service types and models
export * from './user';

// Trace service types and models
export * from './traces';

// ==================== Main Service Model ====================
export * from './conversational-agent.models';
