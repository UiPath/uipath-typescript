/**
 * LLMOps Service Endpoints
 */

import { LLMOPS_BASE } from './base';

/**
 * LLMOps Feedback Service Endpoints
 */
export const FEEDBACK_ENDPOINTS = {
  CREATE: `${LLMOPS_BASE}/api/Feedback`,
  GET_ALL: `${LLMOPS_BASE}/api/Feedback`,
  GET_BY_ID: (id: string) => `${LLMOPS_BASE}/api/Feedback/${id}`,
  UPDATE: (id: string) => `${LLMOPS_BASE}/api/Feedback/${id}`,
  DELETE: (id: string) => `${LLMOPS_BASE}/api/Feedback/${id}`,
  CREATE_CATEGORY: `${LLMOPS_BASE}/api/Feedback/category`,
  GET_CATEGORIES: `${LLMOPS_BASE}/api/Feedback/category`,
  DELETE_CATEGORY: (id: string) => `${LLMOPS_BASE}/api/Feedback/category/${id}`,
} as const;
