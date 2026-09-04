import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { getServices, setupUnifiedTests, InitMode, getTestConfig } from '../../config/unified-setup';
import { Feedback } from '../../../../src/services/agents/feedback';
import { FeedbackStatus, FeedbackResponse } from '../../../../src/models/agents/feedback/feedback.types';
import { registerResource } from '../../utils/cleanup';
import { generateRandomString } from '../../utils/helpers';

const modes: InitMode[] = ['v1'];

/**
 * ApiClient.request issues a single bare fetch with no timeout and no retry
 * (src/core/http/api-client.ts), so one stalled request hangs until vitest's
 * 30s test timeout kills the test. CI run 15 hit exactly that: the first
 * getById of a freshly submitted entry stalled past 30s while the identical
 * call in the next test returned in 365ms. Race the call against a deadline
 * so a stalled attempt is abandoned and reissued instead of eating the test's
 * whole budget. (The underlying fetch cannot be aborted from here — it is
 * merely orphaned, which is acceptable in tests.)
 */
async function withDeadline<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} did not respond within ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

describe.each(modes)('Agent Feedback - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let feedback: Feedback;

  beforeEach(() => {
    feedback = getServices().feedback!;
  });

  describe('getAll', () => {
    it('should retrieve all feedback', async () => {
      const result = await feedback.getAll();

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should retrieve feedback with pagination options', async () => {
      const result = await feedback.getAll({ pageSize: 10 });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(10);
    });

    it('should retrieve feedback with status filter', async () => {
      const result = await feedback.getAll({ status: FeedbackStatus.Pending });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('Feedback structure validation', () => {
    it('should have expected fields in feedback objects', async () => {
      const result = await feedback.getAll({ pageSize: 1 });

      if (result.items.length === 0) {
        throw new Error('No feedback available to validate structure');
      }

      const item = result.items[0];

      expect(item.id).toBeDefined();
      expect(item.traceId).toBeDefined();
      expect(item.spanId).toBeDefined();
      expect(typeof item.isPositive).toBe('boolean');
      expect(Array.isArray(item.feedbackCategories)).toBe(true);
      expect(item.status).toBeDefined();
      expect(item.createdTime).toBeDefined();
      expect(item.updatedTime).toBeDefined();
    });
  });

  describe('getById', () => {
    let existingFeedbackId!: string;
    let existingFolderKey!: string;
    let createdForGetById: string | undefined;

    beforeAll(async () => {
      feedback = getServices().feedback!;
      const configuredFolderKey = getTestConfig().folderKey;
      if (!configuredFolderKey) {
        throw new Error('INTEGRATION_TEST_FOLDER_KEY is not configured — cannot run getById tests.');
      }

      // getAll is tenant-wide, but getById is folder-authorized. Records created
      // elsewhere (a personal workspace, another team's folder) return 403, so
      // pick one that lives in the folder these tests own rather than whichever
      // record happens to sort first.
      const result = await feedback.getAll({ pageSize: 100 });
      if (result.items.length === 0) {
        throw new Error('No feedback in the tenant — cannot obtain a traceId for getById tests.');
      }

      existingFolderKey = configuredFolderKey;

      // Reuse an entry from the test folder when one exists; otherwise create one,
      // so the suite does not depend on another test having run first.
      const accessible = result.items.find((item) => item.folderKey === configuredFolderKey);
      if (accessible) {
        existingFeedbackId = accessible.id;
        return;
      }

      const created = await feedback.submit(result.items[0].traceId, true, {
        comment: 'getById fixture',
        folderKey: configuredFolderKey,
      });
      existingFeedbackId = created.id;
      createdForGetById = created.id;

      // Warm up the fixture before any test reads it. The first read of a
      // freshly submitted entry has been observed to stall server-side for
      // over 30s while every subsequent read of the same entry takes ~400ms,
      // so absorb that first read here with bounded, abandonable attempts
      // rather than letting it burn a test's entire 30s budget.
      const warmupDeadline = Date.now() + 20_000;
      let lastError: unknown;
      while (Date.now() < warmupDeadline) {
        try {
          await withDeadline(
            feedback.getById(created.id, { folderKey: configuredFolderKey }),
            5_000,
            `warm-up getById(${created.id})`
          );
          return;
        } catch (error) {
          lastError = error;
          await new Promise((resolve) => setTimeout(resolve, 1_000));
        }
      }
      throw new Error(
        `getById fixture ${created.id} never became readable within 20s of creation: ${lastError}`
      );
    }, 60_000);

    afterAll(async () => {
      if (createdForGetById) {
        // Cleanup must not fail the suite — warn loudly instead. A leaked entry
        // is benign here: the next run's beforeAll finds it in the test folder
        // and reuses it as the fixture.
        try {
          await withDeadline(
            feedback.deleteById(createdForGetById, { folderKey: existingFolderKey }),
            10_000,
            `cleanup deleteById(${createdForGetById})`
          );
        } catch (error) {
          console.warn(`Failed to delete getById fixture ${createdForGetById}:`, error);
        }
      }
    });

    it('should retrieve feedback by ID', async () => {
      const result = await feedback.getById(existingFeedbackId, { folderKey: existingFolderKey });

      expect(result).toBeDefined();
      expect(result.id).toBe(existingFeedbackId);
    });

    it('should have expected fields on the retrieved feedback', async () => {
      const result: FeedbackResponse = await feedback.getById(existingFeedbackId, { folderKey: existingFolderKey });

      expect(result.id).toBeDefined();
      expect(result.traceId).toBeDefined();
      expect(result.spanId).toBeDefined();
      expect(typeof result.isPositive).toBe('boolean');
      expect(Array.isArray(result.feedbackCategories)).toBe(true);
      expect(result.status).toBeDefined();
      expect(result.createdTime).toBeDefined();
      expect(result.updatedTime).toBeDefined();
    });

    it('should transform API fields — camelCase fields present, raw fields absent', async () => {
      const result = await feedback.getById(existingFeedbackId, { folderKey: existingFolderKey });

      expect(result.createdTime).toBeDefined();
      expect(result.updatedTime).toBeDefined();
      expect((result as any).createdAt).toBeUndefined();
      expect((result as any).updatedAt).toBeUndefined();
    });
  });

  describe('createCategory / getCategories / deleteCategory', () => {
    const createdCategoryIds: string[] = [];

    afterAll(async () => {
      for (const id of createdCategoryIds) {
        await feedback.deleteCategory(id);
      }
    });

    it('should retrieve all categories', async () => {
      const result = await feedback.getCategories();

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should include default categories in results', async () => {
      const result = await feedback.getCategories();

      const defaultNames = ['Output', 'Agent Error', 'Agent Plan Execution'];
      const names = result.items.map((c) => c.category);
      for (const name of defaultNames) {
        expect(names).toContain(name);
      }
    });

    it('should have expected fields on each category', async () => {
      const result = await feedback.getCategories();

      if (result.items.length === 0) throw new Error('No categories returned');

      const item = result.items[0];
      expect(item.id).toBeDefined();
      expect(item.category).toBeDefined();
      expect(item.createdTime).toBeDefined();
      expect(typeof item.isDefault).toBe('boolean');
      expect(typeof item.isPositive).toBe('boolean');
      expect(typeof item.isNegative).toBe('boolean');
    });

    it('should transform API fields — createdTime present, createdAt absent', async () => {
      const result = await feedback.getCategories();

      if (result.items.length === 0) throw new Error('No categories returned');

      expect(result.items[0].createdTime).toBeDefined();
      expect((result.items[0] as any).createdAt).toBeUndefined();
    });

    it('should support isNegative filter', async () => {
      const result = await feedback.getCategories({ isNegative: true });

      expect(result.items).toBeDefined();
      expect(result.items.every((c) => c.isNegative)).toBe(true);
    });

    it('should create a category with no options — defaults to isPositive and isNegative both true', async () => {
      const name = `TestCategory_${generateRandomString(6)}`;
      const result = await feedback.createCategory(name);

      createdCategoryIds.push(result.id);
      registerResource('feedbackCategories', { id: result.id });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.category).toBe(name);
      expect(result.isPositive).toBe(true);
      expect(result.isNegative).toBe(true);
      expect(result.isDefault).toBe(false);
      expect(result.createdTime).toBeDefined();
      expect((result as any).createdAt).toBeUndefined();
    });

    it('should create a category with explicit options', async () => {
      const name = `TestCategory_${generateRandomString(6)}`;
      const result = await feedback.createCategory(name, { isPositive: true, isNegative: false });

      createdCategoryIds.push(result.id);
      registerResource('feedbackCategories', { id: result.id });

      expect(result.isPositive).toBe(true);
      expect(result.isNegative).toBe(false);
    });


    it('should delete a custom category', async () => {
      const name = `TestCategory_${generateRandomString(6)}`;
      const created = await feedback.createCategory(name, { isPositive: false, isNegative: true });
      createdCategoryIds.push(created.id);

      await feedback.deleteCategory(created.id);
      createdCategoryIds.splice(createdCategoryIds.indexOf(created.id), 1);
    });
  });

  describe('submit / updateById / deleteById', () => {
    let traceId!: string;
    let folderKey!: string;
    const createdIds: string[] = [];

    beforeAll(async () => {
      feedback = getServices().feedback!;
      const configuredFolderKey = getTestConfig().folderKey;
      if (!configuredFolderKey) {
        throw new Error('INTEGRATION_TEST_FOLDER_KEY is not configured — cannot run submit/update/delete tests.');
      }

      const result = await feedback.getAll({ pageSize: 1 });
      if (result.items.length === 0) {
        throw new Error('No existing feedback — need at least one entry to obtain a valid traceId');
      }

      // Only the traceId has to come from an existing entry; write the new ones
      // into the folder these tests own, so they stay accessible afterwards.
      traceId = result.items[0].traceId;
      folderKey = configuredFolderKey;
    });

    afterAll(async () => {
      for (const id of createdIds) {
        await feedback.deleteById(id, { folderKey });
      }
    });

    it('should submit a feedback entry with minimum required fields', async () => {
      const result = await feedback.submit(traceId, true, { folderKey });

      createdIds.push(result.id);
      registerResource('feedbackEntries', { id: result.id, folderKey });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.traceId).toBe(traceId);
      expect(result.isPositive).toBe(true);
      expect(result.createdTime).toBeDefined();
      expect(result.updatedTime).toBeDefined();
      expect((result as any).createdAt).toBeUndefined();
      expect((result as any).updatedAt).toBeUndefined();
    });

    it('should update a feedback entry', async () => {
      const created = await feedback.submit(traceId, true, { comment: 'Before update', folderKey });
      createdIds.push(created.id);
      registerResource('feedbackEntries', { id: created.id, folderKey });

      const updated = await feedback.updateById(created.id, false, { comment: 'After update', folderKey });

      expect(updated).toBeDefined();
      expect(updated.id).toBe(created.id);
      expect(updated.isPositive).toBe(false);
      expect(updated.comment).toBe('After update');
      expect(updated.createdTime).toBeDefined();
      expect(updated.updatedTime).toBeDefined();
      expect((updated as any).createdAt).toBeUndefined();
      expect((updated as any).updatedAt).toBeUndefined();
    });

    it('should delete a feedback entry', async () => {
      const created = await feedback.submit(traceId, true, { comment: 'To be deleted', folderKey });
      createdIds.push(created.id);
      registerResource('feedbackEntries', { id: created.id, folderKey });

      await feedback.deleteById(created.id, { folderKey });
      createdIds.splice(createdIds.indexOf(created.id), 1);
    });
  });
});
