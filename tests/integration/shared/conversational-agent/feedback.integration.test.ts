import { describe, it, expect } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { FeedbackStatus } from '../../../../src/models/conversational-agent/feedback/feedback.types';

const modes: InitMode[] = ['v1'];

describe.each(modes)('Agent Feedback - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  describe('getAll', () => {
    it('should retrieve all feedback', async () => {
      const { feedback } = getServices();

      if (!feedback) {
        throw new Error('Feedback service not available in test services');
      }

      const result = await feedback.getAll();

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should retrieve feedback with pagination options', async () => {
      const { feedback } = getServices();

      if (!feedback) {
        throw new Error('Feedback service not available in test services');
      }

      const result = await feedback.getAll({ pageSize: 10 });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(10);
    });

    it('should retrieve feedback with status filter', async () => {
      const { feedback } = getServices();

      if (!feedback) {
        throw new Error('Feedback service not available in test services');
      }

      const result = await feedback.getAll({
        status: FeedbackStatus.Pending,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('Feedback structure validation', () => {
    it('should have expected fields in feedback objects', async () => {
      const { feedback } = getServices();

      if (!feedback) {
        throw new Error('Feedback service not available in test services');
      }

      const result = await feedback.getAll({ pageSize: 1 });

      if (result.items.length === 0) {
        console.log('No feedback available to validate structure');
        return;
      }

      const item = result.items[0];

      expect(item).toBeDefined();
      expect(item.id).toBeDefined();
      expect(item.traceId).toBeDefined();
      expect(item.spanId).toBeDefined();
      expect(typeof item.isPositive).toBe('boolean');
      expect(item.feedbackCategories).toBeDefined();
      expect(Array.isArray(item.feedbackCategories)).toBe(true);
      expect(item.status).toBeDefined();
      expect(item.createdAt).toBeDefined();
      expect(item.updatedAt).toBeDefined();
    });
  });
});
