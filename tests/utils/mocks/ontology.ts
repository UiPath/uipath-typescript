import {
  ArtifactType,
  OntologyState,
  ValidationSeverity,
  RawOntologySummary,
  ArtifactMetadata,
  ArtifactEnvelope,
  ValidationResult,
} from '../../../src/models/ontology/ontology.types';
import { ONTOLOGY_TEST_CONSTANTS } from '../constants/ontology';

export const createMockRawOntology = (overrides: Partial<RawOntologySummary> = {}): RawOntologySummary => ({
  id: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
  name: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME,
  displayName: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_DISPLAY_NAME,
  description: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_DESCRIPTION,
  state: OntologyState.Draft,
  createdBy: ONTOLOGY_TEST_CONSTANTS.CREATED_BY,
  createTime: ONTOLOGY_TEST_CONSTANTS.CREATE_TIME,
  ...overrides,
});

export const createMockArtifactMetadata = (overrides: Partial<ArtifactMetadata> = {}): ArtifactMetadata => ({
  fileName: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_FILE_NAME,
  type: ArtifactType.Schema,
  mediaType: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_MEDIA_TYPE_OFN,
  sizeBytes: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_SIZE_BYTES,
  checksum: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CHECKSUM,
  createdBy: ONTOLOGY_TEST_CONSTANTS.CREATED_BY,
  createTime: ONTOLOGY_TEST_CONSTANTS.CREATE_TIME,
  ...overrides,
});

export const createMockArtifactEnvelope = (overrides: Partial<ArtifactEnvelope> = {}): ArtifactEnvelope => ({
  ...createMockArtifactMetadata(),
  content: ONTOLOGY_TEST_CONSTANTS.ARTIFACT_CONTENT_OFN,
  ...overrides,
});

export const createMockValidationResult = (overrides: Partial<ValidationResult> = {}): ValidationResult => ({
  valid: true,
  type: ArtifactType.Schema,
  violations: [],
  ...overrides,
});

export const createMockValidationFailure = (): ValidationResult => ({
  valid: false,
  type: ArtifactType.Constraints,
  violations: [
    { severity: ValidationSeverity.Error, message: "Undefined prefix 'shx' at line 12", line: 12 },
  ],
});
