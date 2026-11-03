import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getServices, getTestConfig, describeIntegration, InitMode } from '../../config/unified-setup';
import { Ontologies } from '../../../../src/services/ontology';
import { ArtifactType, ValidationSeverity } from '../../../../src/models/ontology/ontology.types';
import { generateRandomString } from '../../utils/helpers';
import { registerResource, cleanupAllTestResources } from '../../utils/cleanup';

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

  afterAll(async () => {
    await cleanupAllTestResources();
  });

  describe('create + getById', () => {
    it('should create in the test folder and read it back with the same folderId', async () => {
      const name = `sdk-it-${generateRandomString(10)}`;
      const created = await ontologies.create(name, { folderKey });
      registerResource('ontologies', { id: created.id });

      const fetched = await ontologies.getById(name, { folderKey });

      expect(fetched.id).toBe(created.id);
      expect(fetched.folderId).toBe(folderKey);
    });
  });

  describe('validateArtifactContent', () => {
    it('should return valid=true for well-formed Turtle', async () => {
      const result = await ontologies.validateArtifactContent('x.ttl', '@prefix : <urn:x#> .', {
        mediaType: 'text/turtle',
        type: ArtifactType.Constraints,
      });

      expect(result.valid).toBe(true);
    });

    it('should return valid=false with an ERROR for malformed Turtle', async () => {
      const result = await ontologies.validateArtifactContent('x.ttl', 'not turtle', {
        mediaType: 'text/turtle',
        type: ArtifactType.Constraints,
      });

      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.severity === ValidationSeverity.Error)).toBe(true);
    });
  });
});
