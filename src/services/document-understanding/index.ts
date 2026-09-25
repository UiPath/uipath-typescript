/**
 * Document Understanding Module
 *
 * Framework contracts plus the validation-station service: start a human
 * validation action for an extraction result, then poll the long-running
 * operation for the validated result.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { DocumentUnderstanding } from '@uipath/uipath-typescript/document-understanding';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const validation = new DocumentUnderstanding(sdk);
 * const { operationId } = await validation.startExtractionValidation(
 *   '<projectId>',
 *   '<tag>',
 *   '<documentTypeId>',
 *   { documentId: '<documentId>', actionTitle: 'Review invoice', extractionResult: result },
 * );
 * ```
 *
 * @module
 */

export { DocumentUnderstanding } from './validation';

export * from '../../models/document-understanding';
