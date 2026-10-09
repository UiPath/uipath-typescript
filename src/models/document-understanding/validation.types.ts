/**
 * Options and SDK response types for Document Understanding validation-station methods.
 *
 * Declared here rather than in `framework/validation.types.ts` because that file
 * is generated from the OpenAPI spec and must not be edited manually.
 */

import type { ActionStatus } from './framework/validation.types';
import type { ModelKind, ModelType } from './framework/folder-based.types';
import type { ErrorSeverity } from './framework/helpers.types';
import type {
  ContentValidationData,
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

/**
 * Validated extraction on a succeeded operation.
 *
 * Envelope fields are SDK camelCase. `actionData`, `validatedExtractionResults`,
 * and `dataProjection` keep the generated framework shapes.
 */
export interface DuValidationResult {
  actionStatus?: ActionStatus;
  actionData?: DocumentExtractionActionDataModel;
  validatedExtractionResults?: ExtractionResult;
  dataProjection?: FieldGroupValueProjection[] | null;
}

export interface DuValidationGetResponse {
  status?: JobStatus;
  error?: DuValidationErrorResponse;
  /** When the operation was created. */
  createdTime?: string;
  /** When the operation was last modified. */
  lastModifiedTime?: string;
  result?: DuValidationResult;
}

/**
 * A model deployed to an Orchestrator folder, as returned by `getModelByName`.
 *
 * `documentTaxonomy` keeps the generated framework shape.
 */
export interface DuModelGetResponse {
  /** Folder path and display name of the deployment, e.g. `Shared/Invoices/Invoices IXP`. */
  fullyQualifiedName?: string | null;
  modelDisplayName?: string | null;
  kind?: ModelKind;
  type?: ModelType;
  description?: string | null;
  asyncDigitizationUrl?: string | null;
  asyncExtractionUrl?: string | null;
  documentTaxonomy?: DocumentTaxonomy;
}

/**
 * Input for `startExtractionValidationArtifacts`.
 *
 * `extractionResult` and `documentTaxonomy` keep the generated framework shapes.
 */
export interface DuValidationArtifactsStartRequest {
  documentId: string;
  extractionResult: ExtractionResult;
  /** Taxonomy of the model that produced the extraction, from `getModelByName`. */
  documentTaxonomy: DocumentTaxonomy;
  /** Path of the folder that holds the storage bucket. Defaults to `Shared`. */
  folderName?: string | null;
  /**
   * Storage bucket the validation-station inputs and the submitted result are written to.
   * Defaults to `du_storage_bucket`, which is created in the folder if it does not exist.
   */
  storageBucketName?: string | null;
  /** Directory inside the bucket. Each operation writes to its own subdirectory. */
  storageBucketDirectoryPath?: string | null;
}

export interface DuValidationArtifactsStartResponse {
  operationId?: string;
  artifactsUrl?: string | null;
  resultUrl?: string | null;
}

/**
 * State of a validation artifacts operation.
 *
 * `contentValidationData` keeps the generated framework shape: pass it unchanged as the
 * `data` of a document validation task.
 */
export interface DuValidationArtifactsGetResponse {
  status: JobStatus;
  error?: DuValidationErrorResponse;
  /** When the operation was created. */
  createdTime?: string;
  /** When the operation was last modified. */
  lastModifiedTime?: string;
  /** Present once `status` is `Succeeded`. */
  contentValidationData?: ContentValidationData;
}

export interface DuValidationArtifactsResult {
  /** What the validator submitted. Absent until the validation task is submitted. */
  validatedExtractionResults?: ExtractionResult;
}

export interface DuValidationArtifactsResultGetResponse {
  result?: DuValidationArtifactsResult;
}
