import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, describeIntegration, InitMode } from '../../config/unified-setup';
import { DuValidation } from '../../../../src/services/document-understanding';
import { UiPathError } from '../../../../src/core/errors';
import type { DuValidationStartRequest } from '../../../../src/models/document-understanding/validation.types';

/**
 * Integration tests for Document Understanding validation start + result poll.
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

describeIntegration('Document Understanding Validation - Integration Tests', 'both', modes, () => {
  let validation!: DuValidation;

  beforeAll(() => {
    const { sdk } = getServices();
    validation = new DuValidation(sdk);
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
});
