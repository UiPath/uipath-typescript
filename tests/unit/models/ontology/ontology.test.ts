import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createOntologyWithMethods,
  OntologyServiceModel,
} from '../../../../src/models/ontology/ontology.models';
import { ArtifactType } from '../../../../src/models/ontology/ontology.types';
import {
  createMockRawOntology,
  createMockArtifactMetadata,
  createMockArtifactEnvelope,
  createMockValidationResult,
} from '../../../utils/mocks/ontology';
import { ONTOLOGY_TEST_CONSTANTS } from '../../../utils/constants/ontology';

describe('Ontology Models — bound methods', () => {
  let mockService: OntologyServiceModel;

  beforeEach(() => {
    mockService = {
      create: vi.fn(),
      getAll: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      deleteById: vi.fn(),
      exportOntology: vi.fn(),
      listArtifacts: vi.fn(),
      getArtifact: vi.fn(),
      upsertArtifact: vi.fn(),
      uploadArtifacts: vi.fn(),
      deleteArtifact: vi.fn(),
      validateArtifact: vi.fn(),
    } as unknown as OntologyServiceModel;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createOntologyWithMethods', () => {
    it('should merge raw data with bound methods', () => {
      const raw = createMockRawOntology();
      const ontology = createOntologyWithMethods(raw, mockService);

      expect(ontology.id).toBe(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID);
      expect(ontology.name).toBe(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME);
      expect(ontology.displayName).toBe(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_DISPLAY_NAME);
      expect(typeof ontology.update).toBe('function');
      expect(typeof ontology.deleteById).toBe('function');
      expect(typeof ontology.exportOntology).toBe('function');
      expect(typeof ontology.listArtifacts).toBe('function');
      expect(typeof ontology.getArtifact).toBe('function');
      expect(typeof ontology.upsertArtifact).toBe('function');
      expect(typeof ontology.uploadArtifacts).toBe('function');
      expect(typeof ontology.deleteArtifact).toBe('function');
      expect(typeof ontology.validateArtifact).toBe('function');
    });

    it('should throw if raw data has no id', () => {
      const raw = createMockRawOntology({ id: '' });
      expect(() => createOntologyWithMethods(raw, mockService)).toThrow('Ontology id is required');
    });
  });

  describe('ontology.update()', () => {
    it('should delegate to service.update with bound ontology id', async () => {
      const raw = createMockRawOntology();
      const ontology = createOntologyWithMethods(raw, mockService);
      const updates = { displayName: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_DISPLAY_NAME_ALT };
      const updated = createMockRawOntology({ displayName: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_DISPLAY_NAME_ALT });
      mockService.update = vi.fn().mockResolvedValue(updated);

      await ontology.update(updates);

      expect(mockService.update).toHaveBeenCalledWith(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID, updates);
    });
  });

  describe('ontology.deleteById()', () => {
    it('should delegate to service.deleteById with bound ontology id', async () => {
      const raw = createMockRawOntology();
      const ontology = createOntologyWithMethods(raw, mockService);
      mockService.deleteById = vi.fn().mockResolvedValue(undefined);

      await ontology.deleteById();

      expect(mockService.deleteById).toHaveBeenCalledWith(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID);
    });
  });

  describe('ontology.exportOntology()', () => {
    it('should delegate to service.exportOntology with bound ontology id', async () => {
      const raw = createMockRawOntology();
      const ontology = createOntologyWithMethods(raw, mockService);
      const mockZip = new Uint8Array([0x50, 0x4b, 0x05, 0x06]);
      mockService.exportOntology = vi.fn().mockResolvedValue(mockZip);

      const result = await ontology.exportOntology();

      expect(mockService.exportOntology).toHaveBeenCalledWith(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID);
      expect(result).toBe(mockZip);
    });
  });

  describe('ontology.listArtifacts()', () => {
    it('should delegate to service.listArtifacts with bound ontology id', async () => {
      const raw = createMockRawOntology();
      const ontology = createOntologyWithMethods(raw, mockService);
      mockService.listArtifacts = vi.fn().mockResolvedValue([createMockArtifactMetadata()]);

      await ontology.listArtifacts();

      expect(mockService.listArtifacts).toHaveBeenCalledWith(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID, undefined);
    });

    it('should forward type filter to service.listArtifacts', async () => {
      const raw = createMockRawOntology();
      const ontology = createOntologyWithMethods(raw, mockService);
      mockService.listArtifacts = vi.fn().mockResolvedValue([createMockArtifactMetadata({ type: ArtifactType.Constraints })]);

      await ontology.listArtifacts({ type: ArtifactType.Constraints });

      expect(mockService.listArtifacts).toHaveBeenCalledWith(
        ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
        { type: ArtifactType.Constraints }
      );
    });
  });

  describe('ontology.getArtifact()', () => {
    it('should delegate to service.getArtifact with bound ontology id and fileName', async () => {
      const raw = createMockRawOntology();
      const ontology = createOntologyWithMethods(raw, mockService);
      mockService.getArtifact = vi.fn().mockResolvedValue(createMockArtifactEnvelope());

      await ontology.getArtifact(ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME);

      expect(mockService.getArtifact).toHaveBeenCalledWith(
        ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME
      );
    });
  });

  describe('ontology.upsertArtifact()', () => {
    it('should delegate to service.upsertArtifact with bound ontology id', async () => {
      const raw = createMockRawOntology();
      const ontology = createOntologyWithMethods(raw, mockService);
      const request = {
        mediaType: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_MEDIA_TYPE_OFN,
        content: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_OFN,
        type: ArtifactType.Schema,
      };
      mockService.upsertArtifact = vi.fn().mockResolvedValue(createMockArtifactMetadata());

      await ontology.upsertArtifact(ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME, request);

      expect(mockService.upsertArtifact).toHaveBeenCalledWith(
        ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME,
        request
      );
    });
  });

  describe('ontology.uploadArtifacts()', () => {
    it('should delegate to service.uploadArtifacts with bound ontology id', async () => {
      const raw = createMockRawOntology();
      const ontology = createOntologyWithMethods(raw, mockService);
      const items = [
        {
          fileName: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME,
          type: ArtifactType.Schema,
          mediaType: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_MEDIA_TYPE_OFN,
          content: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_OFN,
        },
      ];
      mockService.uploadArtifacts = vi.fn().mockResolvedValue([createMockArtifactMetadata()]);

      await ontology.uploadArtifacts(items);

      expect(mockService.uploadArtifacts).toHaveBeenCalledWith(ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID, items);
    });
  });

  describe('ontology.deleteArtifact()', () => {
    it('should delegate to service.deleteArtifact with bound ontology id and fileName', async () => {
      const raw = createMockRawOntology();
      const ontology = createOntologyWithMethods(raw, mockService);
      mockService.deleteArtifact = vi.fn().mockResolvedValue(undefined);

      await ontology.deleteArtifact(ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME_2);

      expect(mockService.deleteArtifact).toHaveBeenCalledWith(
        ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME_2
      );
    });
  });

  describe('ontology.validateArtifact()', () => {
    it('should delegate to service.validateArtifact with bound ontology id', async () => {
      const raw = createMockRawOntology();
      const ontology = createOntologyWithMethods(raw, mockService);
      const request = {
        mediaType: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_MEDIA_TYPE_TURTLE,
        content: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_SHACL,
        type: ArtifactType.Constraints,
      };
      mockService.validateArtifact = vi.fn().mockResolvedValue(createMockValidationResult());

      await ontology.validateArtifact(ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME_2, request);

      expect(mockService.validateArtifact).toHaveBeenCalledWith(
        ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
        ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME_2,
        request
      );
    });
  });
});
