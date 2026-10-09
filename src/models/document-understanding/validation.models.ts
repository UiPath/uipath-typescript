import type {
  DuModelGetResponse,
  DuValidationArtifactsGetResponse,
  DuValidationArtifactsResultGetResponse,
  DuValidationArtifactsStartRequest,
  DuValidationArtifactsStartResponse,
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

  /**
   * Gets a model deployed to an Orchestrator folder, including the document taxonomy that
   * {@link startExtractionValidationArtifacts} needs.
   *
   * @param modelName - Name the model is deployed under in the folder, e.g. `invoices-ixp`.
   * @param folderKey - Key of the folder the model is deployed to.
   * @returns Promise resolving to the {@link DuModelGetResponse} with the model's kind, type and document taxonomy.
   *
   * @example
   * ```typescript
   * const model = await validation.getModelByName('<modelName>', '<folderKey>');
   * console.log(model.type, model.documentTaxonomy);
   * ```
   */
  getModelByName(modelName: string, folderKey: string): Promise<DuModelGetResponse>;

  /**
   * Prepares the validation-station inputs for an extraction made by a folder-deployed model.
   *
   * The inputs are written to the given storage bucket. Poll {@link getExtractionValidationArtifacts}
   * until it returns `contentValidationData`, then open a document validation task over it.
   *
   * @param request - The extraction result, the model's document taxonomy and the storage bucket to write to.
   * @returns Promise resolving to a {@link DuValidationArtifactsStartResponse} carrying the `operationId` to poll.
   *
   * @example
   * ```typescript
   * const model = await validation.getModelByName('<modelName>', '<folderKey>');
   * const { operationId } = await validation.startExtractionValidationArtifacts({
   *   documentId: '<documentId>',
   *   extractionResult: result,
   *   documentTaxonomy: model.documentTaxonomy!,
   *   folderName: '<folderPath>',
   *   storageBucketName: '<storageBucketName>',
   * });
   * ```
   */
  startExtractionValidationArtifacts(
    request: DuValidationArtifactsStartRequest,
  ): Promise<DuValidationArtifactsStartResponse>;

  /**
   * Reads the state of a validation artifacts operation started by {@link startExtractionValidationArtifacts}.
   *
   * Poll this until `status` leaves `NotStarted`/`Running`. A `Succeeded` operation carries
   * `contentValidationData`, which is the `data` of a document validation task.
   *
   * @param operationId - Operation id returned by {@link startExtractionValidationArtifacts}.
   * @returns Promise resolving to the {@link DuValidationArtifactsGetResponse} operation snapshot.
   *
   * @example
   * ```typescript
   * import { Tasks, TaskType } from '@uipath/uipath-typescript/tasks';
   *
   * const artifacts = await validation.getExtractionValidationArtifacts(operationId);
   * // Poll until artifacts.status is no longer 'NotStarted' or 'Running'
   * const data = artifacts.contentValidationData!;
   *
   * const tasks = new Tasks(sdk);
   * const task = await tasks.create(
   *   { type: TaskType.DocumentValidation, title: 'Review invoice', data: { ...data } },
   *   data.FolderId!,
   * );
   * ```
   */
  getExtractionValidationArtifacts(operationId: string): Promise<DuValidationArtifactsGetResponse>;

  /**
   * Reads what the validator submitted for a validation artifacts operation.
   *
   * `result.validatedExtractionResults` is absent until the document validation task is submitted,
   * so read it once the task is completed.
   *
   * @param operationId - Operation id returned by {@link startExtractionValidationArtifacts}.
   * @returns Promise resolving to the {@link DuValidationArtifactsResultGetResponse} with the validated extraction.
   *
   * @example
   * ```typescript
   * const { result } = await validation.getExtractionValidationArtifactsResult(operationId);
   * const validated = result?.validatedExtractionResults;
   * ```
   */
  getExtractionValidationArtifactsResult(operationId: string): Promise<DuValidationArtifactsResultGetResponse>;
}
