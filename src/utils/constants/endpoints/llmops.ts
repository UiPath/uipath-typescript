/**
 * LLMOps Service Endpoints
 */

import { LLMOPS_BASE } from './base';

/**
 * LLMOps Feedback Service Endpoints
 */
export const FEEDBACK_ENDPOINTS = {
  GET_ALL: `${LLMOPS_BASE}/api/Feedback`,
} as const;
