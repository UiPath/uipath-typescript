import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getServices, describeIntegration, InitMode } from '../../config/unified-setup';
import { Ontologies } from '../../../../src/services/ontology';
import { ArtifactType } from '../../../../src/models/ontology/ontology.types';
import type { OntologySummary } from '../../../../src/models/ontology/ontology.models';
import { generateRandomString } from '../../utils/helpers';

const modes: InitMode[] = ['v1'];

const SHACL_FILE_NAME = 'po-shapes.ttl';
const SHACL_MEDIA_TYPE = 'text/turtle';
const SHACL_CONTENT = '@prefix sh: <http://www.w3.org/ns/shacl#> .\n:Shape a sh:NodeShape .';

/** Names are unique per tenant/folder, so every created ontology gets a fresh one. */
const newOntologyName = () => `sdk-it-${generateRandomString(10)}`;

// skip: the Ontology service is not yet provisioned on the integration test tenant.
describeIntegration('Ontologies - Integration Tests', 'both', modes, () => {
  let ontologies!: Ontologies;
  const createdIds: string[] = [];

  const track = (ontology: OntologySummary) => {
    createdIds.push(ontology.id);
    return ontology;
  };

  beforeAll(() => {
    const service = getServices().ontologies;
    if (!service) {
      throw new Error('Ontologies service is not registered for this init mode');
    }
    ontologies = service;
  });

  afterAll(async () => {
    if (!ontologies) return;
    for (const id of createdIds) {
      await ontologies.deleteById(id);
    }
    createdIds.length = 0;
  });

  describe('create + getById', () => {
    it('should create an ontology and retrieve it by id or name', async () => {
      const name = newOntologyName();
      const ontology = track(await ontologies.create(name, {
        displayName: 'Integration Test Ontology',
        description: 'Created by integration test',
      }));

      expect(ontology.id).toBeTruthy();
      expect(ontology.name).toBe(name);
      expect(ontology.displayName).toBe('Integration Test Ontology');
      expect(typeof ontology.deleteById).toBe('function');

      const byId = await ontologies.getById(ontology.id);
      expect(byId.id).toBe(ontology.id);

      const byName = await ontologies.getById(ontology.name);
      expect(byName.id).toBe(ontology.id);
    });
  });

  describe('getAll', () => {
    it('should list ontologies with pagination', async () => {
      const page = await ontologies.getAll({ pageSize: 5 });

      expect(Array.isArray(page.items)).toBe(true);
    });

    it('should filter by search term', async () => {
      const ontology = track(await ontologies.create(newOntologyName()));

      const results = await ontologies.getAll({ search: ontology.name });

      expect(results.items.some((o) => o.id === ontology.id)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update ontology metadata', async () => {
      const ontology = track(await ontologies.create(newOntologyName(), { displayName: 'Update Test' }));

      const updated = await ontologies.update(ontology.id, {
        displayName: 'Updated Name',
        description: 'Updated by test',
      });

      expect(updated.displayName).toBe('Updated Name');
      expect(updated.description).toBe('Updated by test');
    });

    it('should rename the ontology while keeping its id', async () => {
      const ontology = track(await ontologies.create(newOntologyName()));
      const newName = newOntologyName();

      const renamed = await ontologies.update(ontology.id, { name: newName });

      expect(renamed.name).toBe(newName);
      expect(renamed.id).toBe(ontology.id);
    });
  });

  describe('artifacts', () => {
    it('should upsert, retrieve, list, and delete an artifact', async () => {
      const ontology = track(await ontologies.create(newOntologyName()));

      const meta = await ontologies.upsertArtifact(ontology.id, SHACL_FILE_NAME, {
        mediaType: SHACL_MEDIA_TYPE,
        content: SHACL_CONTENT,
        type: ArtifactType.Constraints,
      });
      expect(meta.fileName).toBe(SHACL_FILE_NAME);
      expect(meta.type).toBe(ArtifactType.Constraints);
      expect(meta.sizeBytes).toBeGreaterThan(0);
      expect(meta.checksum).toBeDefined();

      const content = await ontologies.getArtifact(ontology.id, SHACL_FILE_NAME);
      expect(content).toContain('sh:NodeShape');

      const artifacts = await ontologies.listArtifacts(ontology.id);
      expect(artifacts.some((a) => a.fileName === SHACL_FILE_NAME)).toBe(true);

      await ontologies.deleteArtifact(ontology.id, SHACL_FILE_NAME);
      const remaining = await ontologies.listArtifacts(ontology.id);
      expect(remaining.some((a) => a.fileName === SHACL_FILE_NAME)).toBe(false);
    });
  });

  describe('validateArtifact', () => {
    it('should return valid=true for valid content without writing', async () => {
      const ontology = track(await ontologies.create(newOntologyName()));

      const result = await ontologies.validateArtifact(ontology.id, SHACL_FILE_NAME, {
        mediaType: SHACL_MEDIA_TYPE,
        content: SHACL_CONTENT,
        type: ArtifactType.Constraints,
      });

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('deleteById', () => {
    it('should delete the ontology and make it unreadable afterwards', async () => {
      const ontology = track(await ontologies.create(newOntologyName()));

      await ontologies.deleteById(ontology.id);
      createdIds.splice(createdIds.indexOf(ontology.id), 1);

      await expect(ontologies.getById(ontology.id)).rejects.toThrow();
    });
  });
}, { skip: true });
