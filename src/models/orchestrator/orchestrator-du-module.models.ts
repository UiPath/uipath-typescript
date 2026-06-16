import type { ExtractionResult } from '../document-understanding/framework/results.types';
import type {
  ProcessExtractedDataOptions,
  ProcessExtractedDataRequest,
  SubmitExceptionReportOptions,
  SubmitExceptionReportResponse,
} from './orchestrator-du-module.types';

/**
 * Service for the Orchestrator Document Understanding module.
 *
 * Exposes the validation-flow endpoints used by Document Understanding apps to
 * submit exception reports against a task and to process extracted data against
 * a taxonomy. [UiPath Document Understanding Guide](https://docs.uipath.com/document-understanding/automation-cloud/latest)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { OrchestratorDuModule } from '@uipath/uipath-typescript/orchestrator-du-module';
 *
 * const orchestratorDuModule = new OrchestratorDuModule(sdk);
 * ```
 */
export interface OrchestratorDuModuleServiceModel {
  /**
   * Submits an exception report for a Document Understanding validation task.
   *
   * Records that the document under validation cannot be processed normally and captures
   * a reason. The server echoes the submitted payload and signals acceptance via
   * {@link SubmitExceptionReportResponse.IsSuccessful}.
   *
   * @param taskId - Identifier of the validation task the exception applies to.
   * @param documentId - Identifier of the document the exception applies to.
   * @param reason - Free-text reason the document is being reported as an exception.
   * @returns Promise resolving to a {@link SubmitExceptionReportResponse} containing the echoed payload and success status.
   *
   * @example
   * ```typescript
   * import { Tasks, TaskType } from '@uipath/uipath-typescript/tasks';
   *
   * const tasks = new Tasks(sdk);
   *
   * // Fetch the Document Validation task to get its documentId
   * const dvTask = await tasks.getById(<taskId>, { taskType: TaskType.DocumentValidation }, <folderId>);
   * const documentId = dvTask.data?.documentId as string;
   *
   * // Submit an exception report for the validation task
   * const result = await orchestratorDuModule.submitExceptionReport(<taskId>, documentId, '<reason>');
   *
   * if (result.IsSuccessful) {
   *   console.log('Exception recorded for', result.SubmitResult?.DocumentId);
   * }
   * ```
   * @internal
   */
  submitExceptionReport(
    taskId: number,
    documentId: string,
    reason: string,
    options: SubmitExceptionReportOptions,
  ): Promise<SubmitExceptionReportResponse>;

  /**
   * Processes automatically extracted data against validator-edited data and a taxonomy.
   *
   * Sends the automatic extraction result, the validated extraction result, and the
   * document taxonomy to the server, which merges and normalizes the inputs and returns
   * the resulting {@link ExtractionResult}.
   *
   * @param request - Automatic and validated extraction results plus the document taxonomy.
   * @returns Promise resolving to the merged {@link ExtractionResult}.
   *
   * @example
   * ```typescript
   * // Merge automatic and validator-edited extraction results against a taxonomy
   * const result = await orchestratorDuModule.processExtractedData({
   *   AutomaticExtractedResults: <automaticExtractionResult>,
   *   ValidatedExtractedResults: <validatedData>,
   *   Taxonomy: <taxonomy>,
   * });
   *
   * console.log(result.DocumentId, result.ResultsDocument?.DocumentTypeName);
   * ```
   * @internal
   */
  processExtractedData(
    request: ProcessExtractedDataRequest,
    options: ProcessExtractedDataOptions,
  ): Promise<ExtractionResult>;
}
