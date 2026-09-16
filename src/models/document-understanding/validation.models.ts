import type {
  GetExtractionValidationTaskResponse,
  StartExtractionValidationTaskRequestV2_0,
  StartValidationTaskResponse,
} from './framework/validation.types';

/**
 * Options for the Document Understanding validation-station methods.
 *
 * (Declared here rather than in `framework/validation.types.ts` because that file
 * is generated from the OpenAPI spec and must not be edited manually.)
 */
export interface DuValidationRequestOptions {
  /** DU framework API version sent as the `api-version` query param. Defaults to `'1.1'`. */
  apiVersion?: string;
}

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
 * import { DocumentUnderstandingValidation } from '@uipath/uipath-typescript/document-understanding-validation';
 *
 * const validation = new DocumentUnderstandingValidation(sdk);
 * ```
 */
export interface DocumentUnderstandingValidationServiceModel {
  /**
   * Starts a validation action for an extraction result.
   *
   * @param projectId - DU project (modern project) identifier.
   * @param tag - Project version tag the document type belongs to.
   * @param documentTypeId - Document type identifier within the project.
   * @param request - Extraction result plus the action metadata (title, catalog, storage).
   * @param options - Optional framework API version override.
   * @returns Promise resolving to a {@link StartValidationTaskResponse} carrying the `OperationId` to poll.
   *
   * @example
   * ```typescript
   * const { OperationId } = await validation.startExtractionValidation(
   *   '<projectId>',
   *   '<tag>',
   *   '<documentTypeId>',
   *   { DocumentId: '<documentId>', ActionTitle: 'Review invoice', ExtractionResult: result },
   * );
   * ```
   */
  startExtractionValidation(
    projectId: string,
    tag: string,
    documentTypeId: string,
    request: StartExtractionValidationTaskRequestV2_0,
    options?: DuValidationRequestOptions,
  ): Promise<StartValidationTaskResponse>;

  /**
   * Reads the current state of a validation operation started by {@link startExtractionValidation}.
   *
   * Poll this until `Status` leaves `NotStarted`/`Running`; a `Succeeded` operation
   * carries the validated extraction result in `Result`.
   *
   * @param projectId - DU project (modern project) identifier.
   * @param tag - Project version tag the document type belongs to.
   * @param documentTypeId - Document type identifier within the project.
   * @param operationId - Operation id returned by {@link startExtractionValidation}.
   * @param options - Optional framework API version override.
   * @returns Promise resolving to the {@link GetExtractionValidationTaskResponse} operation snapshot.
   */
  getExtractionValidationResult(
    projectId: string,
    tag: string,
    documentTypeId: string,
    operationId: string,
    options?: DuValidationRequestOptions,
  ): Promise<GetExtractionValidationTaskResponse>;
}
