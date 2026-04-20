import { FeedbackCategory, FeedbackStatus } from '../../../src/models/agents/feedback/feedback.types';
import { FEEDBACK_TEST_CONSTANTS } from '../constants/feedback';
import { CONVERSATIONAL_AGENT_TEST_CONSTANTS } from '../constants/conversational-agent';

/**
 * Creates a mock feedback category.
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Mock feedback category data
 */
export const createMockFeedbackCategory = (overrides: Partial<FeedbackCategory> = {}): FeedbackCategory => ({
  id: FEEDBACK_TEST_CONSTANTS.CATEGORY_ID,
  category: FEEDBACK_TEST_CONSTANTS.CATEGORY_NAME,
  createdAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
  isDefault: true,
  isPositive: true,
  isNegative: false,
  ...overrides,
});

/**
 * Creates a mock feedback response as returned by the API.
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Mock feedback data
 */
export const createMockFeedback = (overrides: Record<string, unknown> = {}) => ({
  id: FEEDBACK_TEST_CONSTANTS.FEEDBACK_ID,
  traceId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_TRACE_ID,
  spanId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_SPAN_ID,
  agentId: FEEDBACK_TEST_CONSTANTS.AGENT_UUID,
  isPositive: true,
  comment: 'Great!',
  feedbackCategories: [createMockFeedbackCategory()],
  status: FeedbackStatus.Pending,
  createdAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
  updatedAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
  ...overrides,
});
