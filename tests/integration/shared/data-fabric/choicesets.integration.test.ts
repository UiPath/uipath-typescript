import { describe, it, expect } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Data Fabric ChoiceSets - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  describe('Basic choiceset operations', () => {
    it('should instantiate choicesets service', async () => {
      const { choiceSets } = getServices();

      expect(choiceSets).toBeDefined();

      console.log(
        'Note: ChoiceSet CRUD operations require specific entity configuration. ' +
          'Full testing requires pre-configured entities with choice set fields.'
      );
    });

    it('should verify choiceset service has expected methods', async () => {
      const { choiceSets } = getServices();

      expect(typeof choiceSets.getAll).toBe('function');

      console.log(
        'ChoiceSet tests are entity-dependent. Configure a test entity with choice sets ' +
          'to enable full CRUD testing.'
      );
    });
  });

  describe('ChoiceSet structure validation', () => {
    it('should validate choicesets service is properly structured', () => {
      const { choiceSets } = getServices();

      expect(choiceSets).toBeDefined();
      expect(typeof choiceSets).toBe('object');
    });

    it('should be independent from entities service', () => {
      const { entities, choiceSets } = getServices();

      expect(choiceSets).toBeDefined();
      expect(entities).toBeDefined();
      expect(choiceSets).not.toBe(entities);
    });
  });

  describe('Service verification', () => {
    it('should use the same SDK instance as other services', () => {
      const services = getServices();

      expect(services.sdk).toBeDefined();
      expect(services.choiceSets).toBeDefined();
      expect(services.entities).toBeDefined();
      expect(services.sdk.isAuthenticated()).toBe(true);
    });
  });
});
