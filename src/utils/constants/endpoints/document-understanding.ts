/**
 * Document Understanding Framework Service Endpoints
 */

import { DU_FRAMEWORK_BASE } from './base';

/**
 * Validation-station flow endpoints: start a validation action for an extraction
 * result, then poll the long-running operation for the validated result.
 */
export const DU_VALIDATION_ENDPOINTS = {
  START: (projectId: string, tag: string, documentTypeId: string) =>
    `${DU_FRAMEWORK_BASE}/projects/${projectId}/${tag}/document-types/${documentTypeId}/validation/start`,
  GET_RESULT: (projectId: string, tag: string, documentTypeId: string, operationId: string) =>
    `${DU_FRAMEWORK_BASE}/projects/${projectId}/${tag}/document-types/${documentTypeId}/validation/result/${operationId}`,
} as const;
