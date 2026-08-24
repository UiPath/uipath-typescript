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
