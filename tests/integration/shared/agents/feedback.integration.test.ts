import { describe, it, expect, beforeEach } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Feedback } from '../../../../src/services/agents/feedback';
import { FeedbackStatus } from '../../../../src/models/agents/feedback/feedback.types';

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
});
