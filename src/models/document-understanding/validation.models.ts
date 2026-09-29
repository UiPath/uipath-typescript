import type {
  DuValidationGetResponse,
  DuValidationRequestOptions,
  DuValidationStartRequest,
  DuValidationStartResponse,
} from './validation.types';

/**
 * Service for the Document Understanding validation-station flow.
 *
 * Starts a human validation action for an extraction result and reads back the
 * long-running operation until the validator submits. [Validation activities](https://docs.uipath.com/document-understanding/automation-cloud/latest)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { DocumentUnderstanding } from '@uipath/uipath-typescript/document-understanding';
 *
 * const validation = new DocumentUnderstanding(sdk);
 * ```
 */
export interface DuValidationServiceModel {
  /**
   * Starts a validation action for an extraction result.
   *
   * @param projectId - DU project (modern project) identifier.
   * @param tag - Project version tag the document type belongs to.
   * @param documentTypeId - Document type identifier within the project.
   * @param request - Extraction result plus the action metadata (title, catalog, storage).
   * @param options - Optional framework API version override.
   * @returns Promise resolving to a {@link DuValidationStartResponse} carrying the `operationId` to poll.
   *
   * @example
   * ```typescript
   * const { operationId } = await validation.startExtractionValidation(
   *   '<projectId>',
   *   '<tag>',
   *   '<documentTypeId>',
   *   { documentId: '<documentId>', actionTitle: 'Review invoice', extractionResult: result },
   * );
   * ```
   */
  startExtractionValidation(
    projectId: string,
    tag: string,
    documentTypeId: string,
    request: DuValidationStartRequest,
    options?: DuValidationRequestOptions,
  ): Promise<DuValidationStartResponse>;

  /**
   * Reads the current state of a validation operation started by {@link startExtractionValidation}.
   *
   * Poll this until `status` leaves `NotStarted`/`Running`; a `Succeeded` operation
   * carries the validated extraction result in `result`.
   *
   * @param projectId - DU project (modern project) identifier.
   * @param tag - Project version tag the document type belongs to.
   * @param documentTypeId - Document type identifier within the project.
   * @param operationId - Operation id returned by {@link startExtractionValidation}.
   * @param options - Optional framework API version override.
   * @returns Promise resolving to the {@link DuValidationGetResponse} operation snapshot.
   *
   * @example
   * ```typescript
   * const result = await validation.getExtractionValidationResult(
   *   '<projectId>',
   *   '<tag>',
   *   '<documentTypeId>',
   *   operationId,
   * );
   * // Poll until result.status is no longer 'NotStarted' or 'Running'
   * ```
   */
  getExtractionValidationResult(
    projectId: string,
    tag: string,
    documentTypeId: string,
    operationId: string,
    options?: DuValidationRequestOptions,
  ): Promise<DuValidationGetResponse>;
}
