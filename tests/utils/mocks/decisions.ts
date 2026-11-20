import { Decision, DecisionResponse, DecisionIngestAck } from '../../../src/models/observability/traces/decisions/decisions.types';
import { DECISIONS_TEST_CONSTANTS } from '../constants/decisions';

/** Creates a mock decision (the shape sent to `create` and echoed back inside a response). */
export const createMockDecision = (overrides: Partial<Decision> = {}): Decision => ({
  decisionId: DECISIONS_TEST_CONSTANTS.DECISION_ID,
  data: {
    amount: {
      proposedValue: 1065,
      finalValue: 1065,
      disposition: 'Accepted',
      proposedBy: { identity: 'reference-agent', kind: 'Agent' },
    },
  },
  actor: { identity: 'reviewer@example.com', kind: 'Human' },
  acceptedOutcome: 'Approve',
  decisionTimestamp: DECISIONS_TEST_CONSTANTS.CREATED_AT,
  platform: 'ActionCenter',
  ...overrides,
});

/** Creates a mock raw Decisions API response (pre-transform, with createdAt/updatedAt). */
export const createMockRawDecisionResponse = (overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> => ({
  feedbackId: DECISIONS_TEST_CONSTANTS.FEEDBACK_ID,
  traceId: DECISIONS_TEST_CONSTANTS.TRACE_ID,
  folderKey: DECISIONS_TEST_CONSTANTS.FOLDER_KEY,
  origin: DECISIONS_TEST_CONSTANTS.ORIGIN,
  decision: createMockDecision(),
  createdAt: DECISIONS_TEST_CONSTANTS.CREATED_AT,
  updatedAt: DECISIONS_TEST_CONSTANTS.UPDATED_AT,
  span: null,
  ...overrides,
});

/** Creates a mock transformed {@link DecisionResponse} (post-transform, createdTime/updatedTime). */
export const createMockDecisionResponse = (overrides: Partial<DecisionResponse> = {}): DecisionResponse => ({
  feedbackId: DECISIONS_TEST_CONSTANTS.FEEDBACK_ID,
  traceId: DECISIONS_TEST_CONSTANTS.TRACE_ID,
  folderKey: DECISIONS_TEST_CONSTANTS.FOLDER_KEY,
  origin: DECISIONS_TEST_CONSTANTS.ORIGIN,
  decision: createMockDecision(),
  createdTime: DECISIONS_TEST_CONSTANTS.CREATED_AT,
  updatedTime: DECISIONS_TEST_CONSTANTS.UPDATED_AT,
  span: null,
  ...overrides,
});

/** Creates a mock {@link DecisionIngestAck}. */
export const createMockIngestAck = (overrides: Partial<DecisionIngestAck> = {}): DecisionIngestAck => ({
  decisionId: DECISIONS_TEST_CONSTANTS.DECISION_ID,
  feedbackId: DECISIONS_TEST_CONSTANTS.FEEDBACK_ID,
  ...overrides,
});
