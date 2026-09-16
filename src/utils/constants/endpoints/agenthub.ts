/**
 * AgentHub LLM Gateway Service Endpoints
 */

import { AGENTHUB_LLM_BASE } from './base';

/**
 * OpenAI-compatible chat completion endpoint served by the LLM gateway.
 */
export const AGENTHUB_ENDPOINTS = {
  CREATE_CHAT_COMPLETION: `${AGENTHUB_LLM_BASE}/chat/completions`,
} as const;
