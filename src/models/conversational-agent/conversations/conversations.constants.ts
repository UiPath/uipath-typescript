/**
 * Constants for Conversational Agent
 */

import { CommonFieldMap } from '../common.constants';

/**
 * Maps API response fields to SDK field names (API → SDK)
 * Used when transforming API responses for SDK consumers.
 * For request transformation (SDK → API), use `transformRequest(data, ConversationMap)`.
 */
export const ConversationMap: { [key: string]: string } = {
  ...CommonFieldMap,
  conversationId: 'id',
  lastActivityAt: 'lastActivityTime',
  agentReleaseId: 'agentId'
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
