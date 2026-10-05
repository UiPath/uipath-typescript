import { track } from '../../core/telemetry';
import { ValidationError } from '../../core/errors';
import type {
  GetExtractionValidationTaskResponse,
  StartValidationTaskResponse,
} from '../../models/document-understanding/framework/validation.types';
import type { DuValidationServiceModel } from '../../models/document-understanding/validation.models';
import { DuValidationMap } from '../../models/document-understanding/validation.constants';
import type {
  DuValidationGetResponse,
  DuValidationRequestOptions,
  DuValidationStartRequest,
  DuValidationStartResponse,
} from '../../models/document-understanding/validation.types';
import { DU_VALIDATION_ENDPOINTS } from '../../utils/constants/endpoints';
import { camelToPascalCase, pascalToCamelCase, transformData } from '../../utils/transform';
import { BaseService } from '../base';

const DEFAULT_API_VERSION = '1.1';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Converts one object's own keys. Nested values, including framework payloads, are copied as-is. */
function shallowConvertKeys(
  data: object,
  convertKey: (key: string) => string,
): Record<string, unknown> {
  const converted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    converted[convertKey(key)] = value;
  }
  return converted;
}

function shallowCamelCaseEnvelope(data: object): Record<string, unknown> {
  const envelope = shallowConvertKeys(data, pascalToCamelCase);
  if (isPlainObject(envelope.error)) {
    envelope.error = shallowConvertKeys(envelope.error, pascalToCamelCase);
  }
  if (isPlainObject(envelope.result)) {
    envelope.result = shallowConvertKeys(envelope.result, pascalToCamelCase);
  }
  return envelope;
}

/**
 * Service for the Document Understanding validation-station flow.
 */
export class DocumentUnderstanding
  extends BaseService
  implements DuValidationServiceModel
{
  @track('DocumentUnderstanding.StartExtractionValidation')
  async startExtractionValidation(
    projectId: string,
    tag: string,
    documentTypeId: string,
    request: DuValidationStartRequest,
    options: DuValidationRequestOptions = {},
  ): Promise<DuValidationStartResponse> {
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
      shallowConvertKeys(request, camelToPascalCase),
      { params: { 'api-version': options.apiVersion ?? DEFAULT_API_VERSION } },
    );
    return shallowConvertKeys(response.data, pascalToCamelCase) as DuValidationStartResponse;
  }

  @track('DocumentUnderstanding.GetExtractionValidationResult')
  async getExtractionValidationResult(
    projectId: string,
    tag: string,
    documentTypeId: string,
    operationId: string,
    options: DuValidationRequestOptions = {},
  ): Promise<DuValidationGetResponse> {
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
    return transformData(shallowCamelCaseEnvelope(response.data), DuValidationMap) as DuValidationGetResponse;
  }
}
