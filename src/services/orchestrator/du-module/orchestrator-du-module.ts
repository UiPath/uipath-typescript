import { track } from '../../../core/telemetry';
import type { ExtractionResult } from '../../../models/document-understanding/framework/results.types';
import type { OrchestratorDuModuleServiceModel } from '../../../models/orchestrator/orchestrator-du-module.models';
import type {
  ProcessExtractedDataOptions,
  ProcessExtractedDataRequest,
  SubmitExceptionReportOptions,
  SubmitExceptionReportResponse,
} from '../../../models/orchestrator/orchestrator-du-module.types';
import { ORCHESTRATOR_DU_MODULE_ENDPOINTS } from '../../../utils/constants/endpoints';
import { resolveFolderHeaders } from '../../../utils/folder/folder-headers';
import { BaseService } from '../../base';

/**
 * Service for the Orchestrator Document Understanding module.
 */
export class OrchestratorDuModuleService extends BaseService implements OrchestratorDuModuleServiceModel {
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
  @track('OrchestratorDuModule.SubmitExceptionReport')
  async submitExceptionReport(
    taskId: number,
    documentId: string,
    reason: string,
    options: SubmitExceptionReportOptions,
  ): Promise<SubmitExceptionReportResponse> {
    const headers = resolveFolderHeaders({
      folderId: options.folderId,
      folderKey: options.folderKey,
      folderPath: options.folderPath,
      resourceType: 'orchestratorDuModule.submitExceptionReport',
      fallbackFolderKey: this.config.folderKey,
    });

    const response = await this.post<SubmitExceptionReportResponse>(
      ORCHESTRATOR_DU_MODULE_ENDPOINTS.SUBMIT_EXCEPTION_REPORT,
      { DocumentId: documentId, Reason: reason },
      { params: { taskId }, headers },
    );
    return response.data;
  }

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
  @track('OrchestratorDuModule.ProcessExtractedData')
  async processExtractedData(
    request: ProcessExtractedDataRequest,
    options: ProcessExtractedDataOptions,
  ): Promise<ExtractionResult> {
    const headers = resolveFolderHeaders({
      folderId: options.folderId,
      folderKey: options.folderKey,
      folderPath: options.folderPath,
      resourceType: 'orchestratorDuModule.processExtractedData',
      fallbackFolderKey: this.config.folderKey,
    });

    const response = await this.post<ExtractionResult>(
      ORCHESTRATOR_DU_MODULE_ENDPOINTS.PROCESS_EXTRACTED_DATA,
      request,
      { headers },
    );
    return response.data;
  }
}
