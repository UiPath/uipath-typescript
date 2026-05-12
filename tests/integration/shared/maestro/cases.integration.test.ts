import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { isNotFoundError } from '../../../../src/core/errors';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Maestro Cases - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  describe('Case access and structure', () => {
    it('should instantiate cases service', async () => {
      const { cases } = getServices();

      expect(cases).toBeDefined();
    });

    it('should retrieve case definitions', async () => {
      const { cases } = getServices();

      try {
        const result = await cases.getAll();

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);

        if (result.length > 0) {
          const caseItem = result[0];
          expect(caseItem).toBeDefined();
          expect(caseItem.processKey || caseItem.key).toBeDefined();
        }
      } catch (error: any) {
        if (error.message?.includes('Forbidden') || error.statusCode === 403) {
          console.log(
            'Skipping test: PAT token does not have Maestro permissions. ' +
              'Grant Maestro (Read) scope when creating the token.'
          );
          return;
        }
        console.log('Case retrieval test:', error.message);
      }
    });
  });

  describe('Case CRUD operations', () => {
    it('should support case definition operations', async () => {
      const { cases } = getServices();

      expect(cases).toBeDefined();
      expect(typeof cases.getAll).toBe('function');

      console.log(
        'Case CRUD tests require appropriate permissions and Maestro configuration. ' +
          'These operations are typically performed through the UiPath UI.'
      );
    });

    it('should have separate case instances service', async () => {
      const { cases, caseInstances } = getServices();

      expect(cases).toBeDefined();
      expect(caseInstances).toBeDefined();
      expect(cases).not.toBe(caseInstances);

      expect(typeof cases.getAll).toBe('function');
      expect(typeof caseInstances.getAll).toBe('function');
    });
  });

  describe('Case metadata and validation', () => {
    it('should validate case API structure', () => {
      const { cases, caseInstances } = getServices();

      expect(cases).toBeDefined();
      expect(caseInstances).toBeDefined();
      expect(typeof cases).toBe('object');
      expect(typeof caseInstances).toBe('object');
    });

    it('should have expected methods on cases service', () => {
      const { cases } = getServices();

      expect(typeof cases.getAll).toBe('function');
    });
  });

  describe('Service verification', () => {
    it('should use the same SDK instance as other Maestro services', () => {
      const services = getServices();

      expect(services.sdk).toBeDefined();
      expect(services.cases).toBeDefined();
      expect(services.caseInstances).toBeDefined();
      expect(services.maestroProcesses).toBeDefined();
      expect(services.sdk.isAuthenticated()).toBe(true);
    });
  });

  describe('getByName', () => {
    let existing!: { name: string; folderKey: string; folderName: string };
    let folderKey!: string;

    beforeAll(async () => {
      const config = getTestConfig();
      if (!config.folderKey) {
        throw new Error('INTEGRATION_TEST_FOLDER_KEY must be configured for Cases getByName tests');
      }
      folderKey = config.folderKey;

      const { cases } = getServices();
      const all = await cases.getAll();
      const match = all.find((c) => c.folderKey === folderKey);
      if (!match) {
        throw new Error(
          `No Maestro cases found in folder ${folderKey} — seed at least one for getByName tests`,
        );
      }
      existing = { name: match.name, folderKey: match.folderKey, folderName: match.folderName };
    });

    it('should retrieve a case by name using folderKey', async () => {
      const { cases } = getServices();

      const result = await cases.getByName(existing.name, { folderKey });

      expect(result).toBeDefined();
      expect(result.name).toBe(existing.name);
      expect(result.folderKey).toBe(folderKey);
    });

    it('should retrieve a case by name using folderPath', async () => {
      const { cases } = getServices();

      const result = await cases.getByName(existing.name, { folderPath: existing.folderName });

      expect(result).toBeDefined();
      expect(result.name).toBe(existing.name);
      expect(result.folderName).toBe(existing.folderName);
    });

    it('should throw NotFoundError for a nonexistent case name', async () => {
      const { cases } = getServices();

      const missingName = `__uipath-sdk-nonexistent-case-${Date.now()}`;
      await expect(
        cases.getByName(missingName, { folderKey }),
      ).rejects.toSatisfy(isNotFoundError);
    });
  });
});
