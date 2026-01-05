/**
 * Conversational Agent Service Endpoints
 */

import { AUTOPILOT_BASE, LLM_OPS_BASE } from './base';

const API_VERSION = 'v1';

/**
 * Conversation Endpoints
 */
export const CONVERSATION_ENDPOINTS = {
  LIST: `${AUTOPILOT_BASE}/api/${API_VERSION}/conversation`,
  CREATE: `${AUTOPILOT_BASE}/api/${API_VERSION}/conversation`,
  GET: (id: string) => `${AUTOPILOT_BASE}/api/${API_VERSION}/conversation/${id}`,
  UPDATE: (id: string) => `${AUTOPILOT_BASE}/api/${API_VERSION}/conversation/${id}`,
  DELETE: (id: string) => `${AUTOPILOT_BASE}/api/${API_VERSION}/conversation/${id}`
} as const;

/**
 * Exchange Endpoints
 */
export const EXCHANGE_ENDPOINTS = {
  LIST: (conversationId: string) =>
    `${AUTOPILOT_BASE}/api/${API_VERSION}/conversation/${conversationId}/exchange`,
  GET: (conversationId: string, exchangeId: string) =>
    `${AUTOPILOT_BASE}/api/${API_VERSION}/conversation/${conversationId}/exchange/${exchangeId}`,
  CREATE_FEEDBACK: (conversationId: string, exchangeId: string) =>
    `${AUTOPILOT_BASE}/api/${API_VERSION}/conversation/${conversationId}/exchange/${exchangeId}/feedback`
} as const;

/**
 * Message Endpoints
 */
export const MESSAGE_ENDPOINTS = {
  GET: (conversationId: string, exchangeId: string, messageId: string) =>
    `${AUTOPILOT_BASE}/api/${API_VERSION}/conversation/${conversationId}/exchange/${exchangeId}/message/${messageId}`,
  GET_CONTENT_PART: (conversationId: string, exchangeId: string, messageId: string, contentPartId: string) =>
    `${AUTOPILOT_BASE}/api/${API_VERSION}/conversation/${conversationId}/exchange/${exchangeId}/message/${messageId}/contentPart/${contentPartId}`
} as const;

/**
 * Attachment Endpoints
 */
export const ATTACHMENT_ENDPOINTS = {
  CREATE: (conversationId: string) =>
    `${AUTOPILOT_BASE}/api/${API_VERSION}/conversation/${conversationId}/attachment`
} as const;

/**
 * Agent Endpoints
 */
export const AGENT_ENDPOINTS = {
  LIST: `${AUTOPILOT_BASE}/api/${API_VERSION}/agent`,
  GET: (folderId: number, agentId: number) => `${AUTOPILOT_BASE}/api/${API_VERSION}/agent/${folderId}/${agentId}`
} as const;

/**
 * User Endpoints
 */
export const USER_ENDPOINTS = {
  SETTINGS: `${AUTOPILOT_BASE}/api/${API_VERSION}/user/settings`
} as const;

/**
 * Utility Endpoints
 */
export const UTILITY_ENDPOINTS = {
  FEATURE_FLAGS: `${AUTOPILOT_BASE}/api/utility/feature-flags`
} as const;

/**
 * Traces/LLM Ops Endpoints
 */
export const TRACES_ENDPOINTS = {
  GET_SPANS: (traceId: string) => `${LLM_OPS_BASE}/api/Traces/spans?traceId=${traceId}`
} as const;

/**
 * WebSocket Events
 */
export const WEBSOCKET_EVENTS = {
  CONVERSATION_EVENT: 'ConversationEvent'
} as const;

/**
 * WebSocket Headers
 */
export const WEBSOCKET_HEADERS = {
  ORGANIZATION_ID: 'x-uipath-internal-accountid',
  TENANT_ID: 'x-uipath-internal-tenantid',
  EXTERNAL_USER_ID: 'x-uipath-external-user-id'
} as const;
