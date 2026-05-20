// Auto-generated from the OpenAPI spec — do not edit manually.

import type { DocumentActionPriority } from './actions.types';
import type {
    ClassificationResult,
    ExtractionResult,
} from './results.types';
import type { ActionStatus } from './validation.types';

export interface ClassificationValidationFinishedTaskInfo {
    Id?: number;
    Title?: string | null;
    Priority?: DocumentActionPriority;
    Status?: ActionStatus;
    CreationTime?: string;
    CompletionTime?: string | null;
    LastAssignedTime?: string;
    Url?: string | null;
    AssignedToUser?: string | null;
    CompletedByUser?: string | null;
    LastModifierUser?: string | null;
    DocumentRejectionReason?: string | null;
    CatalogName?: string | null;
    FolderName?: string | null;
    ProcessingTime?: number | null;
}

export interface FinishExtractionValidationTaskInfo {
    Id?: number;
    Title?: string | null;
    Priority?: DocumentActionPriority;
    Status?: ActionStatus;
    CreationTime?: string;
    CompletionTime?: string | null;
    LastAssignedTime?: string;
    Url?: string | null;
    AssignedToUser?: string | null;
    CompletedByUser?: string | null;
    LastModifierUser?: string | null;
    DocumentRejectionReason?: string | null;
    CatalogName?: string | null;
    FolderName?: string | null;
    ProcessingTime?: number | null;
}

export interface StartClassificationValidationTaskInfo {
    Id?: number;
    Title?: string | null;
    FolderName?: string | null;
    StorageBucketName?: string | null;
    StorageBucketDirectoryPath?: string | null;
    CatalogName?: string | null;
    Priority?: DocumentActionPriority;
    Status?: ActionStatus;
}

export interface StartExtractionValidationTaskInfo {
    Id?: number;
    Title?: string | null;
    FolderName?: string | null;
    StorageBucketName?: string | null;
    StorageBucketDirectoryPath?: string | null;
    CatalogName?: string | null;
    Priority?: DocumentActionPriority;
    Status?: ActionStatus;
}

export interface TrackFinishClassificationValidationRequest {
    ClassifierId?: string | null;
    Tag?: string | null;
    DocumentId?: string;
    Task?: ClassificationValidationFinishedTaskInfo;
    ClassificationResult?: ClassificationResult[] | null;
}

export interface TrackFinishExtractionValidationRequest {
    ExtractorId?: string | null;
    Tag?: string | null;
    DocumentTypeId?: string | null;
    DocumentId?: string;
    Task?: FinishExtractionValidationTaskInfo;
    ExtractionResult?: ExtractionResult;
    ValidatedExtractionResult?: ExtractionResult;
}

export interface TrackStartClassificationValidationRequest {
    ClassifierId?: string | null;
    Tag?: string | null;
    DocumentId?: string;
    Duration?: number;
    Task?: StartClassificationValidationTaskInfo;
    ClassificationResult?: ClassificationResult[] | null;
}

export interface TrackStartExtractionValidationRequest {
    ExtractorId?: string | null;
    Tag?: string | null;
    DocumentTypeId?: string | null;
    DocumentId?: string;
    Duration?: number;
    Task?: StartExtractionValidationTaskInfo;
    ExtractionResult?: ExtractionResult;
}
