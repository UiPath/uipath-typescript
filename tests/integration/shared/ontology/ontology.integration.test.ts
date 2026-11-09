import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, describeIntegration, InitMode } from '@tests/integration/config/unified-setup';
import { Ontologies } from '@/services/ontology';
import { ArtifactType, ValidationSeverity } from '@/models/ontology/ontology.types';

const modes: InitMode[] = ['v1'];

describeIntegration('Ontologies - Integration Tests', 'both', modes, () => {
  let ontologies!: Ontologies;
  let folderKey!: string;

  beforeAll(() => {
    const service = getServices().ontologies;
    if (!service) {
      throw new Error('Ontologies service is not registered for this init mode');
    }
    const config = getTestConfig();
    if (!config.folderKey) {
      throw new Error('INTEGRATION_TEST_FOLDER_KEY must be configured to run Ontologies integration tests');
    }
    ontologies = service;
    folderKey = config.folderKey;
  });

  describe('getAll + getById', () => {
    it('should list the ontologies in the test folder and read one back by name', async () => {
      const { items } = await ontologies.getAll({ folderKey });
      if (items.length === 0) {
        throw new Error('No ontologies in INTEGRATION_TEST_FOLDER_KEY; deploy one to run this test');
      }
      const [first] = items;

      expect(first.folderId?.toLowerCase()).toBe(folderKey.toLowerCase());
      const fetched = await ontologies.getById(first.name, { folderKey });
      expect(fetched.id).toBe(first.id);
    });

    it('should return SDK field names, not the API timestamp names', async () => {
      const { items } = await ontologies.getAll({ folderKey });
      if (items.length === 0) {
        throw new Error('No ontologies in INTEGRATION_TEST_FOLDER_KEY; deploy one to run this test');
      }

      const ontology = await ontologies.getById(items[0].id, { folderKey });

      expect(ontology.createdTime).toBeDefined();
      expect((ontology as Record<string, unknown>).createTime).toBeUndefined();
      expect((ontology as Record<string, unknown>).updateTime).toBeUndefined();
    });

    it('should page through the list with pageSize', async () => {
      const page = await ontologies.getAll({ folderKey, pageSize: 1 });

      expect(page.items.length).toBeLessThanOrEqual(1);
      if (page.hasNextPage && page.nextCursor) {
        const next = await ontologies.getAll({ folderKey, cursor: page.nextCursor });
        expect(next.items[0]?.id).not.toBe(page.items[0]?.id);
      }
    });
  });

  describe('validateArtifactContent', () => {
    it('should return valid=true for well-formed Turtle', async () => {
      const result = await ontologies.validateArtifactContent('x.ttl', '@prefix : <urn:x#> .', 'text/turtle', {
        type: ArtifactType.Constraints,
      });

      expect(result.valid).toBe(true);
    });

    it('should return valid=false with an ERROR for malformed Turtle', async () => {
      const result = await ontologies.validateArtifactContent('x.ttl', 'not turtle', 'text/turtle', {
        type: ArtifactType.Constraints,
      });

      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.severity === ValidationSeverity.Error)).toBe(true);
    });
  });
});
