import { LLMOPS_BASE } from './base';

/**
 * Agent Feedback Service Endpoints
 */
export const FEEDBACK_ENDPOINTS = {
  GET_ALL: `${LLMOPS_BASE}/api/Feedback`,
  GET_BY_ID: (id: string) => `${LLMOPS_BASE}/api/Feedback/${id}`,
} as const;
