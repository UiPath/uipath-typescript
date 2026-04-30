// Auto-generated from the OpenAPI spec — do not edit manually.

import type { ErrorResponse } from './helpers.types';
import type {
    ClassificationPrompt,
    ClassificationValidationConfiguration,
    ContentValidationData,
    CreateTaskPriority,
    DocumentClassificationActionDataModel,
    DocumentExtractionActionDataModel,
    ExtractionPrompt,
    ExtractionValidationConfigurationV2,
    FieldGroupValueProjection,
} from './model.types';
import type {
    ClassificationResult,
    ExtractionResult,
} from './results.types';
import type { DocumentTaxonomy } from './taxonomy.types';

export enum ActionStatus {
    Unassigned = 'Unassigned',
    Pending = 'Pending',
    Completed = 'Completed',
}

export interface ClassificationValidationResult {
    actionStatus?: ActionStatus;
    actionData?: DocumentClassificationActionDataModel;
    validatedClassificationResults?: ClassificationResult[] | null;
}

export interface ExtractionValidationArtifactsResult {
    validatedExtractionResults?: ExtractionResult;
}

export interface ExtractionValidationResult {
    actionStatus?: ActionStatus;
    actionData?: DocumentExtractionActionDataModel;
    validatedExtractionResults?: ExtractionResult;
    dataProjection?: FieldGroupValueProjection[] | null;
}

export interface GetClassificationValidationTaskResponse {
    status?: 'Succeeded' | 'Failed' | 'Running' | 'NotStarted';
    error?: ErrorResponse;
    createdAt?: string;
    lastUpdatedAt?: string;
    result?: ClassificationValidationResult;
}

export interface GetExtractionValidationArtifactsResultTaskResponse {
    result?: ExtractionValidationArtifactsResult;
}

export interface GetExtractionValidationArtifactsTaskResponse {
    status?: 'Succeeded' | 'Failed' | 'Running' | 'NotStarted';
    error?: ErrorResponse;
    createdAt?: string;
    lastUpdatedAt?: string;
    contentValidationData?: ContentValidationData;
}

export interface GetExtractionValidationTaskResponse {
    status?: 'Succeeded' | 'Failed' | 'Running' | 'NotStarted';
    error?: ErrorResponse;
    createdAt?: string;
    lastUpdatedAt?: string;
    result?: ExtractionValidationResult;
}

export interface StartClassificationValidationTaskRequest {
    documentId?: string | null;
    actionTitle?: string | null;
    actionPriority?: CreateTaskPriority;
    actionCatalog?: string | null;
    actionFolder?: string | null;
    storageBucketName?: string | null;
    storageBucketDirectoryPath?: string | null;
    prompts?: ClassificationPrompt[] | null;
    configuration?: ClassificationValidationConfiguration;
    classificationResults?: ClassificationResult[] | null;
}

export interface StartExtractionValidationArtifactsRequest {
    documentId?: string;
    extractionResult?: ExtractionResult;
    documentTaxonomy?: DocumentTaxonomy;
    folderName?: string | null;
    storageBucketName?: string | null;
    storageBucketDirectoryPath?: string | null;
}

export interface StartExtractionValidationTaskRequestV2_0 {
    documentId?: string | null;
    actionTitle?: string | null;
    actionPriority?: CreateTaskPriority;
    actionCatalog?: string | null;
    actionFolder?: string | null;
    storageBucketName?: string | null;
    storageBucketDirectoryPath?: string | null;
    fieldsValidationConfidence?: number | null;
    allowChangeOfDocumentType?: boolean | null;
    prompts?: ExtractionPrompt[] | null;
    extractionResult?: ExtractionResult;
    configuration?: ExtractionValidationConfigurationV2;
    documentTaxonomy?: DocumentTaxonomy;
}

export interface StartValidationArtifactsTaskResponse {
    operationId?: string;
    artifactsUrl?: string | null;
    resultUrl?: string | null;
}

export interface StartValidationTaskResponse {
    operationId?: string;
    resultUrl?: string | null;
}
