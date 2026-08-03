import { describe, it, expect, afterAll } from 'vitest';
import { ArtifactType } from '../../../../src/models/ontology/ontology.types';
import { setupUnifiedTests, getServices } from '../../config/unified-setup';

const getService = () => getServices().ontologies!;

// skip: Ontology service is not yet provisioned on the alpha tenant.
// Tests are wired and ready — remove describe.skip once the service is enabled on appsdev/appsdevDefault.
describe.skip('Ontology Service — Integration Tests', () => {
  const createdIds: string[] = [];

  setupUnifiedTests('v1');

  afterAll(async () => {
    const svc = getService();
    for (const id of createdIds) {
      await svc.deleteById(id).catch(() => {});
    }
  });

  describe('create + getById', () => {
    it('should create an ontology and retrieve it by id or name', async () => {
      const svc = getService();

      const ontology = await svc.create('integration-test-ontology', {
        displayName: 'Integration Test Ontology',
        description: 'Created by integration test',
      });
      createdIds.push(ontology.id);

      expect(ontology.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(ontology.name).toBe('integration-test-ontology');
      expect(ontology.displayName).toBe('Integration Test Ontology');
      expect(typeof ontology.deleteById).toBe('function');

      // Retrieve by GUID
      const byId = await svc.getById(ontology.id);
      expect(byId.id).toBe(ontology.id);

      // Retrieve by name
      const byName = await svc.getById(ontology.name);
      expect(byName.id).toBe(ontology.id);
    });
  });

  describe('getAll', () => {
    it('should list ontologies with pagination', async () => {
      const svc = getService();
      const page = await svc.getAll({ pageSize: 5 });

      expect(Array.isArray(page.items)).toBe(true);
    });

    it('should filter by search term', async () => {
      const svc = getService();
      const results = await svc.getAll({ search: 'integration-test' });
      expect(Array.isArray(results.items)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update ontology metadata', async () => {
      const svc = getService();
      const ontology = await svc.create('update-test', { displayName: 'Update Test' });
      createdIds.push(ontology.id);

      const updated = await svc.update(ontology.id, {
        displayName: 'Updated Name',
        description: 'Updated by test',
      });

      expect(updated.displayName).toBe('Updated Name');
      expect(updated.description).toBe('Updated by test');
    });

    it('should rename the ontology when name is provided', async () => {
      const svc = getService();
      const ontology = await svc.create('rename-test', { displayName: 'Rename Test' });
      createdIds.push(ontology.id);

      const renamed = await svc.update(ontology.id, { name: 'rename-test-v2' });

      expect(renamed.name).toBe('rename-test-v2');
      expect(renamed.id).toBe(ontology.id);

      // Update cleanup id reference (name changed but id is stable)
      createdIds.splice(createdIds.indexOf(ontology.id), 1, renamed.id);
    });
  });

  describe('artifacts', () => {
    it('should upsert, retrieve, list, and delete an artifact', async () => {
      const svc = getService();
      const ontology = await svc.create('artifacts-test', { displayName: 'Artifacts Test' });
      createdIds.push(ontology.id);

      const meta = await svc.upsertArtifact(ontology.id, 'po-shapes.ttl', {
        mediaType: 'text/turtle',
        content: '@prefix sh: <http://www.w3.org/ns/shacl#> .\n:Shape a sh:NodeShape .',
        type: ArtifactType.Constraints,
      });
      expect(meta.fileName).toBe('po-shapes.ttl');
      expect(meta.type).toBe(ArtifactType.Constraints);
      expect(meta.sizeBytes).toBeGreaterThan(0);
      expect(meta.checksum).toBeDefined();

      const content = await svc.getArtifact(ontology.id, 'po-shapes.ttl');
      expect(content).toContain('sh:NodeShape');

      const artifacts = await svc.listArtifacts(ontology.id);
      expect(artifacts.some((a) => a.fileName === 'po-shapes.ttl')).toBe(true);

      await svc.deleteArtifact(ontology.id, 'po-shapes.ttl');
      const remaining = await svc.listArtifacts(ontology.id);
      expect(remaining.some((a) => a.fileName === 'po-shapes.ttl')).toBe(false);
    });
  });

  describe('validateArtifact', () => {
    it('should return valid=true for valid content without writing', async () => {
      const svc = getService();
      const ontology = await svc.create('validate-test', { displayName: 'Validate Test' });
      createdIds.push(ontology.id);

      const result = await svc.validateArtifact(ontology.id, 'po-shapes.ttl', {
        mediaType: 'text/turtle',
        content: '@prefix sh: <http://www.w3.org/ns/shacl#> .\n:Shape a sh:NodeShape .',
        type: ArtifactType.Constraints,
      });

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('deleteById', () => {
    it('should delete ontology and cascade its artifacts', async () => {
      const svc = getService();
      const ontology = await svc.create('delete-test', { displayName: 'Delete Test' });

      await svc.deleteById(ontology.id);
      createdIds.splice(createdIds.indexOf(ontology.id), 1);

      await expect(svc.getById(ontology.id)).rejects.toThrow();
    });
  });
});
