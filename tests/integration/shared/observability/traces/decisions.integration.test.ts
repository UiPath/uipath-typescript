import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, describeIntegration, InitMode, getTestConfig } from '../../../config/unified-setup';
import { Decisions } from '../../../../../src/services/observability/traces/decisions';
import { DecisionCreateInput } from '../../../../../src/models/observability/traces/decisions/decisions.types';
import { generateRandomString } from '../../../utils/helpers';

const modes: InitMode[] = ['v1'];

describeIntegration('Decisions - Integration Tests', 'user', modes, () => {
  let decisions!: Decisions;
  let folderKey!: string;
  let traceId!: string;

  beforeAll(() => {
    decisions = getServices().decisions!;
    const configuredFolderKey = getTestConfig().folderKey;
    if (!configuredFolderKey) {
      throw new Error('INTEGRATION_TEST_FOLDER_KEY is not configured — cannot run Decisions tests.');
    }
    folderKey = configuredFolderKey;
    traceId = generateRandomString(32);
  });

  const newDecision = (overrides: Partial<DecisionCreateInput> = {}): DecisionCreateInput => ({
    decisionId: generateRandomString(16),
    data: {
      amount: {
        proposedValue: 1065,
        finalValue: 1065,
        disposition: 'Accepted',
        proposedBy: { identity: 'integration-test-agent', kind: 'Agent' },
      },
    },
    actor: { identity: 'integration-test@example.com', kind: 'Human' },
    acceptedOutcome: 'Approve',
    decisionTimestamp: new Date().toISOString(),
    platform: 'ActionCenter',
    ...overrides,
  });

  describe('create', () => {
    it('should write a decision and return a matching ack', async () => {
      const decision = newDecision();

      const acks = await decisions.create(traceId, [decision], folderKey);

      expect(acks).toHaveLength(1);
      expect(acks[0].decisionId).toBe(decision.decisionId);
      expect(acks[0].feedbackId).toBeDefined();
    });

    it('should upsert a decision under the same feedbackId', async () => {
      const decision = newDecision();

      const first = await decisions.create(traceId, [decision], folderKey);
      const second = await decisions.create(traceId, [{ ...decision, acceptedOutcome: 'Approve after correction' }], folderKey);

      expect(second[0].feedbackId).toBe(first[0].feedbackId);
    });
  });

  describe('getById', () => {
    it('should retrieve the decision just written, with the folder recorded', async () => {
      const decision = newDecision();
      await decisions.create(traceId, [decision], folderKey);

      const result = await decisions.getById(decision.decisionId, { folderKey });

      expect(result.decision.decisionId).toBe(decision.decisionId);
      expect(result.decision.acceptedOutcome).toBe(decision.acceptedOutcome);
      expect(result.folderKey).toBe(folderKey);
    });

    it('should transform API fields — createdTime and updatedTime present, createdAt and updatedAt absent', async () => {
      const decision = newDecision();
      await decisions.create(traceId, [decision], folderKey);

      const result = await decisions.getById(decision.decisionId, { folderKey });

      expect(result.createdTime).toBeDefined();
      expect(result.updatedTime).toBeDefined();
      expect((result as any).createdAt).toBeUndefined();
      expect((result as any).updatedAt).toBeUndefined();
    });
  });

  describe('list', () => {
    it('should list the decisions written to this trace', async () => {
      const decision = newDecision();
      await decisions.create(traceId, [decision], folderKey);

      const result = await decisions.list({ traceId, folderKey });

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.some((item) => item.decision.decisionId === decision.decisionId)).toBe(true);
    });

    it('should return createdTime and updatedTime, not createdAt and updatedAt', async () => {
      const decision = newDecision();
      await decisions.create(traceId, [decision], folderKey);

      const result = await decisions.list({ traceId, folderKey });

      const item = result.items.find((i) => i.decision.decisionId === decision.decisionId)!;
      expect(item.createdTime).toBeDefined();
      expect(item.updatedTime).toBeDefined();
      expect((item as any).createdAt).toBeUndefined();
      expect((item as any).updatedAt).toBeUndefined();
    });
  });

  describe('query', () => {
    it('should find the decision by decisionId', async () => {
      const decision = newDecision();
      await decisions.create(traceId, [decision], folderKey);

      const result = await decisions.query({ decisionId: decision.decisionId, folderKey, take: 1 });

      expect(result.totalCount).toBeGreaterThan(0);
      expect(result.items[0].decision.decisionId).toBe(decision.decisionId);
    });

    it('should return createdTime and updatedTime, not createdAt and updatedAt', async () => {
      const decision = newDecision();
      await decisions.create(traceId, [decision], folderKey);

      const result = await decisions.query({ decisionId: decision.decisionId, folderKey, take: 1 });

      expect(result.items[0].createdTime).toBeDefined();
      expect(result.items[0].updatedTime).toBeDefined();
      expect((result.items[0] as any).createdAt).toBeUndefined();
      expect((result.items[0] as any).updatedAt).toBeUndefined();
    });

    it('should find the decision by process name, sorted by creation time', async () => {
      const processName = `Process-${generateRandomString(8)}`;
      const decision = newDecision({ processInstanceMetadata: { processName } });
      await decisions.create(traceId, [decision], folderKey);

      const result = await decisions.query({ processName, folderKey, sortBy: 'CreatedAt', descending: true });

      expect(result.items.some((item) => item.decision.decisionId === decision.decisionId)).toBe(true);
    });

    it('should find the decision by actor identity and accepted outcome', async () => {
      const decision = newDecision({ acceptedOutcome: `Approve-${generateRandomString(8)}` });
      await decisions.create(traceId, [decision], folderKey);

      const result = await decisions.query({
        actorIdentity: decision.actor.identity,
        acceptedOutcome: decision.acceptedOutcome,
        folderKey,
      });

      expect(result.items.some((item) => item.decision.decisionId === decision.decisionId)).toBe(true);
    });
  });
});
