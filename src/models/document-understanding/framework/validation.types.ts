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
    JobStatus,
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
    ActionStatus?: ActionStatus;
    ActionData?: DocumentClassificationActionDataModel;
    ValidatedClassificationResults?: ClassificationResult[] | null;
}

export interface ExtractionValidationArtifactsResult {
    ValidatedExtractionResults?: ExtractionResult;
}

export interface ExtractionValidationResult {
    ActionStatus?: ActionStatus;
    ActionData?: DocumentExtractionActionDataModel;
    ValidatedExtractionResults?: ExtractionResult;
    DataProjection?: FieldGroupValueProjection[] | null;
}

export interface GetClassificationValidationTaskResponse {
    Status?: JobStatus;
    Error?: ErrorResponse;
    CreatedAt?: string;
    LastUpdatedAt?: string;
    Result?: ClassificationValidationResult;
}

export interface GetExtractionValidationArtifactsResultTaskResponse {
    Result?: ExtractionValidationArtifactsResult;
}

export interface GetExtractionValidationArtifactsTaskResponse {
    Status?: JobStatus;
    Error?: ErrorResponse;
    CreatedAt?: string;
    LastUpdatedAt?: string;
    ContentValidationData?: ContentValidationData;
}

export interface GetExtractionValidationTaskResponse {
    Status?: JobStatus;
    Error?: ErrorResponse;
    CreatedAt?: string;
    LastUpdatedAt?: string;
    Result?: ExtractionValidationResult;
}

export interface StartClassificationValidationTaskRequest {
    DocumentId?: string | null;
    ActionTitle?: string | null;
    ActionPriority?: CreateTaskPriority;
    ActionCatalog?: string | null;
    ActionFolder?: string | null;
    StorageBucketName?: string | null;
    StorageBucketDirectoryPath?: string | null;
    Prompts?: ClassificationPrompt[] | null;
    Configuration?: ClassificationValidationConfiguration;
    ClassificationResults?: ClassificationResult[] | null;
}

export interface StartExtractionValidationArtifactsRequest {
    DocumentId?: string;
    ExtractionResult?: ExtractionResult;
    DocumentTaxonomy?: DocumentTaxonomy;
    FolderName?: string | null;
    StorageBucketName?: string | null;
    StorageBucketDirectoryPath?: string | null;
}

export interface StartExtractionValidationTaskRequestV2_0 {
    DocumentId?: string | null;
    ActionTitle?: string | null;
    ActionPriority?: CreateTaskPriority;
    ActionCatalog?: string | null;
    ActionFolder?: string | null;
    StorageBucketName?: string | null;
    StorageBucketDirectoryPath?: string | null;
    Prompts?: ExtractionPrompt[] | null;
    ExtractionResult?: ExtractionResult;
    Configuration?: ExtractionValidationConfigurationV2;
    DocumentTaxonomy?: DocumentTaxonomy;
}

export interface StartValidationArtifactsTaskResponse {
    OperationId?: string;
    ArtifactsUrl?: string | null;
    ResultUrl?: string | null;
}

export interface StartValidationTaskResponse {
    OperationId?: string;
    ResultUrl?: string | null;
}
