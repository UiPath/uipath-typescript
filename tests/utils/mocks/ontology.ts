import {
  OntologyArtifactType,
  OntologyState,
  OntologyValidationSeverity,
  OntologyValidateArtifactContentResponse,
} from '@/models/ontology/ontology.types';
import type { RawOntologyGetResponse } from '@/models/ontology/ontology.internal-types';
import { ONTOLOGY_TEST_CONSTANTS } from '@tests/utils/constants/ontology';

export const createMockRawOntology = (overrides: Partial<RawOntologyGetResponse> = {}): RawOntologyGetResponse => ({
  id: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_ID,
  name: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_NAME,
  displayName: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_DISPLAY_NAME,
  description: ONTOLOGY_TEST_CONSTANTS.ONTOLOGY_DESCRIPTION,
  folderId: ONTOLOGY_TEST_CONSTANTS.FOLDER_KEY,
  state: OntologyState.Draft,
  createdBy: ONTOLOGY_TEST_CONSTANTS.CREATED_BY,
  createTime: ONTOLOGY_TEST_CONSTANTS.CREATE_TIME,
  ...overrides,
});

export const createMockValidationResult = (overrides: Partial<OntologyValidateArtifactContentResponse> = {}): OntologyValidateArtifactContentResponse => ({
  valid: true,
  type: OntologyArtifactType.Schema,
  violations: [],
  ...overrides,
});

export const createMockValidationFailure = (): OntologyValidateArtifactContentResponse => ({
  valid: false,
  type: OntologyArtifactType.Constraints,
  violations: [
    { severity: OntologyValidationSeverity.Error, message: "Undefined prefix 'shx' at line 12" },
  ],
});
