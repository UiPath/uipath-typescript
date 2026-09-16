import type {
  GetExtractionValidationTaskResponse,
  StartExtractionValidationTaskRequestV2_0,
  StartValidationTaskResponse,
} from './framework/validation.types';
import type { DuValidationRequestOptions } from './validation.types';

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
 * import { DuValidation } from '@uipath/uipath-typescript/document-understanding';
 *
 * const validation = new DuValidation(sdk);
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
