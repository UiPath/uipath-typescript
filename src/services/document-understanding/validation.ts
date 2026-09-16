import { track } from '../../core/telemetry';
import { ValidationError } from '../../core/errors';
import type {
  GetExtractionValidationTaskResponse,
  StartExtractionValidationTaskRequestV2_0,
  StartValidationTaskResponse,
} from '../../models/document-understanding/framework/validation.types';
import type { DuValidationServiceModel } from '../../models/document-understanding/validation.models';
import type { DuValidationRequestOptions } from '../../models/document-understanding/validation.types';
import { DU_VALIDATION_ENDPOINTS } from '../../utils/constants/endpoints';
import { BaseService } from '../base';

const DEFAULT_API_VERSION = '1.1';

/**
 * Service for the Document Understanding validation-station flow.
 */
export class DuValidationService
  extends BaseService
  implements DuValidationServiceModel
{
  @track('DuValidation.StartExtractionValidation')
  async startExtractionValidation(
    projectId: string,
    tag: string,
    documentTypeId: string,
    request: StartExtractionValidationTaskRequestV2_0,
    options: DuValidationRequestOptions = {},
  ): Promise<StartValidationTaskResponse> {
    if (!projectId) {
      throw new ValidationError({ message: 'projectId is required for startExtractionValidation' });
    }
    if (!tag) {
      throw new ValidationError({ message: 'tag is required for startExtractionValidation' });
    }
    if (!documentTypeId) {
      throw new ValidationError({ message: 'documentTypeId is required for startExtractionValidation' });
    }
    if (!request) {
      throw new ValidationError({ message: 'request is required for startExtractionValidation' });
    }

    const response = await this.post<StartValidationTaskResponse>(
      DU_VALIDATION_ENDPOINTS.START(projectId, tag, documentTypeId),
      request,
      { params: { 'api-version': options.apiVersion ?? DEFAULT_API_VERSION } },
    );
    return response.data;
  }

  @track('DuValidation.GetExtractionValidationResult')
  async getExtractionValidationResult(
    projectId: string,
    tag: string,
    documentTypeId: string,
    operationId: string,
    options: DuValidationRequestOptions = {},
  ): Promise<GetExtractionValidationTaskResponse> {
    if (!projectId) {
      throw new ValidationError({ message: 'projectId is required for getExtractionValidationResult' });
    }
    if (!tag) {
      throw new ValidationError({ message: 'tag is required for getExtractionValidationResult' });
    }
    if (!documentTypeId) {
      throw new ValidationError({ message: 'documentTypeId is required for getExtractionValidationResult' });
    }
    if (!operationId) {
      throw new ValidationError({ message: 'operationId is required for getExtractionValidationResult' });
    }

    const response = await this.get<GetExtractionValidationTaskResponse>(
      DU_VALIDATION_ENDPOINTS.GET_RESULT(projectId, tag, documentTypeId, operationId),
      { params: { 'api-version': options.apiVersion ?? DEFAULT_API_VERSION } },
    );
    return response.data;
  }
}
