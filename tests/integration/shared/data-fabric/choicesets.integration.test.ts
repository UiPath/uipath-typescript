import { describe, it, expect } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Data Fabric ChoiceSets - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);
  let testChoiceSetId: string | null = null;

  describe('getAll', () => {
    it('should retrieve all choice sets', async () => {
      const { choiceSets } = getServices();
      const result = await choiceSets.getAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      if (result.length === 0) {
        throw new Error('No choice sets available for getById testing');
      }

      const choiceSet = result[0] as any;
      testChoiceSetId = choiceSet.id;
      
      expect(choiceSet.name).toBeDefined();
      expect(choiceSet.displayName).toBeDefined();
      expect(typeof choiceSet.name).toBe('string');
      expect(typeof choiceSet.displayName).toBe('string');
      expect(testChoiceSetId).toBeDefined();
      expect(typeof testChoiceSetId).toBe('string');
    });
  });

  describe('getById', () => {
    it('should retrieve choice set values by choice set ID', async () => {
      const { choiceSets } = getServices();

      if (!testChoiceSetId) {
        throw new Error('No choice set ID available for getById testing');
      }

      const result = await choiceSets.getById(testChoiceSetId);

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);

      if (result.items.length > 0) {
        const value = result.items[0];
        expect(value.id).toBeDefined();
        expect(value.name).toBeDefined();
        expect(value.displayName).toBeDefined();
        expect(typeof value.id).toBe('string');
      }
    });

    it('should retrieve choice set values with pagination options', async () => {
      const { choiceSets } = getServices();

      if (!testChoiceSetId) {
        throw new Error('No choice set ID available for paginated getById testing');
      }

      const result = await choiceSets.getById(testChoiceSetId, {
        pageSize: 5,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(5);
    });
  });
});
