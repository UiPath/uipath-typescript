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
 * Maps API filter param names (left) to SDK-facing names (right) for the conversation list endpoint.
 * Used by `getAll` to translate SDK filters to the field names the backend expects. Kept separate
 * from `ConversationMap` because `label`/`search` would otherwise collide with the `label` field
 * on create/update payloads.
 */
export const ConversationGetAllFilterMap: { [key: string]: string } = {
  agentReleaseKey: 'agentKey',
  agentReleaseId: 'agentId',
  search: 'label'
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
