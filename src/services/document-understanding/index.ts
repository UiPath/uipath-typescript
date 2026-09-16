/**
 * Document Understanding Validation Module
 *
 * Provides access to the UiPath Document Understanding validation-station flow:
 * start a human validation action for an extraction result, then poll the
 * long-running operation for the validated result.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { DocumentUnderstandingValidation } from '@uipath/uipath-typescript/document-understanding-validation';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const validation = new DocumentUnderstandingValidation(sdk);
 * const { OperationId } = await validation.startExtractionValidation(
 *   '<projectId>',
 *   '<tag>',
 *   '<documentTypeId>',
 *   { DocumentId: '<documentId>', ActionTitle: 'Review invoice', ExtractionResult: result },
 * );
 * ```
 *
 * @module
 */

export {
  DocumentUnderstandingValidationService as DocumentUnderstandingValidation,
  DocumentUnderstandingValidationService,
} from './validation';

export * from '../../models/document-understanding/validation.models';
