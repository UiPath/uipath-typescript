import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Feedback } from '../../../../src/services/agents/feedback';
import { FeedbackStatus, FeedbackResponse } from '../../../../src/models/agents/feedback/feedback.types';
import { registerResource } from '../../utils/cleanup';
import { generateRandomString } from '../../utils/helpers';

const modes: InitMode[] = ['v1'];

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

    beforeAll(async () => {
      feedback = getServices().feedback!;
      const result = await feedback.getAll({ pageSize: 1 });
      if (result.items.length === 0) {
        throw new Error('No feedback available for getById tests — create at least one feedback entry first');
      }
      existingFeedbackId = result.items[0].id;
      if (!result.items[0].folderKey) {
        throw new Error('Feedback entry missing folderKey — cannot run getById tests');
      }
      existingFolderKey = result.items[0].folderKey;
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
      const result = await feedback.getAll({ pageSize: 1 });
      if (result.items.length === 0) {
        throw new Error('No existing feedback — need at least one entry to obtain a valid traceId and folderKey');
      }
      if (!result.items[0].folderKey) {
        throw new Error('Feedback entry missing folderKey — cannot run submit/update/delete tests');
      }
      traceId = result.items[0].traceId;
      folderKey = result.items[0].folderKey;
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
