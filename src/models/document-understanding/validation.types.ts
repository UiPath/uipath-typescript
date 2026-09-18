/**
 * Options and SDK response types for Document Understanding validation-station methods.
 *
 * Declared here rather than in `framework/validation.types.ts` because that file
 * is generated from the OpenAPI spec and must not be edited manually.
 */

import type { ActionStatus } from './framework/validation.types';
import type { ErrorSeverity } from './framework/helpers.types';
import type {
  CreateTaskPriority,
  DocumentExtractionActionDataModel,
  ExtractionPrompt,
  ExtractionValidationConfigurationV2,
  FieldGroupValueProjection,
  JobStatus,
} from './framework/model.types';
import type { ExtractionResult } from './framework/results.types';
import type { DocumentTaxonomy } from './framework/taxonomy.types';

export interface DuValidationRequestOptions {
  /** DU framework API version sent as the `api-version` query param. Defaults to `'1.1'`. */
  apiVersion?: string;
}

/**
 * Input for `startExtractionValidation`.
 *
 * Envelope fields use SDK camelCase names. Nested Document Understanding
 * contracts (`extractionResult`, `prompts`, `configuration`, `documentTaxonomy`)
 * keep the generated framework shapes.
 */
export interface DuValidationStartRequest {
  documentId?: string | null;
  actionTitle?: string | null;
  actionPriority?: CreateTaskPriority;
  actionCatalog?: string | null;
  actionFolder?: string | null;
  storageBucketName?: string | null;
  storageBucketDirectoryPath?: string | null;
  prompts?: ExtractionPrompt[] | null;
  extractionResult?: ExtractionResult;
  configuration?: ExtractionValidationConfigurationV2;
  documentTaxonomy?: DocumentTaxonomy;
}

export interface DuValidationStartResponse {
  operationId?: string;
  resultUrl?: string | null;
}

export interface DuValidationErrorResponse {
  message?: string | null;
  severity?: ErrorSeverity;
  code?: string | null;
  parameters?: string[] | null;
}

export interface DuValidationResult {
  actionStatus?: ActionStatus;
  actionData?: DocumentExtractionActionDataModel;
  validatedExtractionResults?: ExtractionResult;
  dataProjection?: FieldGroupValueProjection[] | null;
}

export interface DuValidationGetResponse {
  status?: JobStatus;
  error?: DuValidationErrorResponse;
  createdAt?: string;
  lastUpdatedAt?: string;
  result?: DuValidationResult;
}
