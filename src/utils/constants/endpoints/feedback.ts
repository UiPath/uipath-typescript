import { LLMOPS_BASE } from './base';

/**
 * Agent Feedback Service Endpoints
 */
export const FEEDBACK_ENDPOINTS = {
  GET_ALL: `${LLMOPS_BASE}/api/Feedback`,
  GET_BY_ID: (id: string) => `${LLMOPS_BASE}/api/Feedback/${id}`,
  SUBMIT: `${LLMOPS_BASE}/api/Feedback`,
  UPDATE: (id: string) => `${LLMOPS_BASE}/api/Feedback/${id}`,
  DELETE: (id: string) => `${LLMOPS_BASE}/api/Feedback/${id}`,
  CATEGORY: {
    GET_ALL: `${LLMOPS_BASE}/api/Feedback/category`,
    CREATE: `${LLMOPS_BASE}/api/Feedback/category`,
    DELETE: (id: string) => `${LLMOPS_BASE}/api/Feedback/category/${id}`,
  },
} as const;
