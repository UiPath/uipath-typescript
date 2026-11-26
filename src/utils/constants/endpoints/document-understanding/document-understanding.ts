/**
 * Document Understanding Framework Service Endpoints
 */

import { DU_FRAMEWORK_BASE } from '../base';

/**
 * Validation-station flow endpoints: start a validation action for an extraction
 * result, then poll the long-running operation for the validated result.
 */
export const DU_VALIDATION_ENDPOINTS = {
  START: (projectId: string, tag: string, documentTypeId: string) =>
    `${DU_FRAMEWORK_BASE}/projects/${projectId}/${tag}/document-types/${documentTypeId}/validation/start`,
  GET_RESULT: (projectId: string, tag: string, documentTypeId: string, operationId: string) =>
    `${DU_FRAMEWORK_BASE}/projects/${projectId}/${tag}/document-types/${documentTypeId}/validation/result/${operationId}`,
  /**
   * Validation artifacts for models deployed to a folder: prepare the validation-station
   * inputs in a storage bucket, read them back, then read what the validator submitted.
   */
  ARTIFACTS: {
    START: `${DU_FRAMEWORK_BASE}/extraction-validation/artifacts/start`,
    GET: (operationId: string) =>
      `${DU_FRAMEWORK_BASE}/extraction-validation/artifacts/content-validation-data/${operationId}`,
    GET_RESULT: (operationId: string) =>
      `${DU_FRAMEWORK_BASE}/extraction-validation/artifacts/validation-result/${operationId}`,
  },
} as const;

/**
 * Endpoints for models deployed to an Orchestrator folder, addressed by model name.
 */
export const DU_MODEL_ENDPOINTS = {
  GET_BY_NAME: (modelName: string) => `${DU_FRAMEWORK_BASE}/models/${modelName}`,
} as const;
