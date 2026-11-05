import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, describeIntegration, InitMode } from '../../config/unified-setup';
import { DocumentUnderstanding } from '../../../../src/services/document-understanding';
import { UiPathError } from '../../../../src/core/errors';
import type {
  DuValidationArtifactsStartRequest,
  DuValidationStartRequest,
} from '../../../../src/models/document-understanding/validation.types';

/**
 * Integration tests for Document Understanding validation start + result poll, and
 * the validation artifacts flow for models deployed to a folder.
 *
 * These methods create Action Center tasks against a real DU project, so the suite
 * hits the live endpoints with unknown ids and asserts the SDK maps the API error.
 * A happy-path start/poll needs a tenant fixture (project, document type, extraction
 * result) that this environment does not provision.
 *
 * Run with:
 *   npx vitest run tests/integration/shared/document-understanding/validation.integration.test.ts --config vitest.integration.config.ts
 */

const modes: InitMode[] = ['v1'];

const UNKNOWN_ID = '00000000-0000-0000-0000-000000000000';
const TAG = 'production';

const START_REQUEST: DuValidationStartRequest = {
  documentId: UNKNOWN_ID,
  actionTitle: 'sdk-it-du-validation',
  extractionResult: { DocumentId: UNKNOWN_ID },
};

const ARTIFACTS_START_REQUEST: DuValidationArtifactsStartRequest = {
  documentId: UNKNOWN_ID,
  extractionResult: { DocumentId: UNKNOWN_ID },
  documentTaxonomy: {},
};

describeIntegration('Document Understanding Validation - Integration Tests', 'both', modes, () => {
  let validation!: DocumentUnderstanding;

  beforeAll(() => {
    const { sdk } = getServices();
    validation = new DocumentUnderstanding(sdk);
  });

  describe('startExtractionValidation', () => {
    it('should throw for a nonexistent project', async () => {
      await expect(
        validation.startExtractionValidation(UNKNOWN_ID, TAG, UNKNOWN_ID, START_REQUEST),
      ).rejects.toBeInstanceOf(UiPathError);
    });
  });

  describe('getExtractionValidationResult', () => {
    it('should throw for a nonexistent operation', async () => {
      await expect(
        validation.getExtractionValidationResult(UNKNOWN_ID, TAG, UNKNOWN_ID, UNKNOWN_ID),
      ).rejects.toBeInstanceOf(UiPathError);
    });
  });

  describe('getModelByName', () => {
    it('should throw for a model not deployed to the folder', async () => {
      await expect(validation.getModelByName('sdk-it-no-such-model', UNKNOWN_ID)).rejects.toBeInstanceOf(UiPathError);
    });
  });

  describe('startExtractionValidationArtifacts', () => {
    it('should throw for a nonexistent document', async () => {
      await expect(validation.startExtractionValidationArtifacts(ARTIFACTS_START_REQUEST)).rejects.toBeInstanceOf(
        UiPathError,
      );
    });
  });

  describe('getExtractionValidationArtifacts', () => {
    it('should throw for a nonexistent operation', async () => {
      await expect(validation.getExtractionValidationArtifacts(UNKNOWN_ID)).rejects.toBeInstanceOf(UiPathError);
    });
  });

  describe('getExtractionValidationArtifactsResult', () => {
    it('should throw for a nonexistent operation', async () => {
      await expect(validation.getExtractionValidationArtifactsResult(UNKNOWN_ID)).rejects.toBeInstanceOf(UiPathError);
    });
  });
});
