import { FeedbackCategory, FeedbackCategoryResponse, FeedbackStatus } from '../../../src/models/agents/feedback/feedback.types';
import { RawFeedbackResponse, RawFeedbackCategory, RawFeedbackCategoryListResponse } from '../../../src/models/agents/feedback/feedback.internal-types';
import { FEEDBACK_TEST_CONSTANTS } from '../constants/feedback';
import { CONVERSATIONAL_AGENT_TEST_CONSTANTS } from '../constants/conversational-agent';

/**
 * Creates a mock raw feedback category (pre-transform, with createdAt).
 */
export const createMockRawFeedbackCategory = (overrides: Partial<RawFeedbackCategory> = {}): RawFeedbackCategory => ({
  id: FEEDBACK_TEST_CONSTANTS.CATEGORY_ID,
  category: FEEDBACK_TEST_CONSTANTS.CATEGORY_NAME,
  createdAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
  isDefault: true,
  isPositive: true,
  isNegative: false,
  ...overrides,
});

/**
 * Creates a mock raw category list response (pre-transform).
 */
export const createMockRawCategoryListResponse = (
  overrides: Partial<RawFeedbackCategoryListResponse> = {}
): RawFeedbackCategoryListResponse => ({
  categories: [createMockRawFeedbackCategory()],
  totalCount: 1,
  ...overrides,
});

/**
 * Creates a mock feedback category (nested inside FeedbackResponse, has createdAt).
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
 * Creates a mock feedback get-category response (post-transform, has createdTime).
 * Used for createCategory / getCategories method assertions.
 */
export const createMockFeedbackCategoryResponse = (overrides: Partial<FeedbackCategoryResponse> = {}): FeedbackCategoryResponse => ({
  id: FEEDBACK_TEST_CONSTANTS.CATEGORY_ID,
  category: FEEDBACK_TEST_CONSTANTS.CATEGORY_NAME,
  createdTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
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
export const createMockFeedback = (overrides: Partial<RawFeedbackResponse> = {}): RawFeedbackResponse => ({
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
