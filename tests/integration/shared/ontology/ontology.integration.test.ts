import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, describeIntegration, InitMode } from '../../config/unified-setup';
import { Ontologies } from '../../../../src/services/ontology';
import { ArtifactType, ValidationSeverity } from '../../../../src/models/ontology/ontology.types';

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
    it('should list the ontologies in the test folder and read each back by name', async () => {
      const { items } = await ontologies.getAll({ folderKey });

      for (const item of items) {
        expect(item.folderId?.toLowerCase()).toBe(folderKey.toLowerCase());
        const fetched = await ontologies.getById(item.name, { folderKey });
        expect(fetched.id).toBe(item.id);
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
