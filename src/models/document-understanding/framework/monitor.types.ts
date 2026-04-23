// Auto-generated from the OpenAPI spec — do not edit manually.

import type { DocumentActionPriority } from './actions.types';
import type {
    ClassificationResult,
    ExtractionResult,
} from './results.types';
import type { ActionStatus } from './validation.types';

export interface ClassificationValidationFinishedTaskInfo {
    id?: number;
    title?: string | null;
    priority?: DocumentActionPriority;
    status?: ActionStatus;
    creationTime?: string;
    completionTime?: string | null;
    lastAssignedTime?: string;
    url?: string | null;
    assignedToUser?: string | null;
    completedByUser?: string | null;
    lastModifierUser?: string | null;
    documentRejectionReason?: string | null;
    catalogName?: string | null;
    folderName?: string | null;
    processingTime?: number | null;
}

export interface FinishExtractionValidationTaskInfo {
    id?: number;
    title?: string | null;
    priority?: DocumentActionPriority;
    status?: ActionStatus;
    creationTime?: string;
    completionTime?: string | null;
    lastAssignedTime?: string;
    url?: string | null;
    assignedToUser?: string | null;
    completedByUser?: string | null;
    lastModifierUser?: string | null;
    documentRejectionReason?: string | null;
    catalogName?: string | null;
    folderName?: string | null;
    processingTime?: number | null;
}

export interface StartClassificationValidationTaskInfo {
    id?: number;
    title?: string | null;
    folderName?: string | null;
    storageBucketName?: string | null;
    storageBucketDirectoryPath?: string | null;
    catalogName?: string | null;
    priority?: DocumentActionPriority;
    status?: ActionStatus;
}

export interface StartExtractionValidationTaskInfo {
    id?: number;
    title?: string | null;
    folderName?: string | null;
    storageBucketName?: string | null;
    storageBucketDirectoryPath?: string | null;
    catalogName?: string | null;
    priority?: DocumentActionPriority;
    status?: ActionStatus;
}

export interface TrackFinishClassificationValidationRequest {
    classifierId?: string | null;
    tag?: string | null;
    documentId?: string;
    task?: ClassificationValidationFinishedTaskInfo;
    classificationResult?: ClassificationResult[] | null;
}

export interface TrackFinishExtractionValidationRequest {
    extractorId?: string | null;
    tag?: string | null;
    documentTypeId?: string | null;
    documentId?: string;
    task?: FinishExtractionValidationTaskInfo;
    extractionResult?: ExtractionResult;
    validatedExtractionResult?: ExtractionResult;
}

export interface TrackStartClassificationValidationRequest {
    classifierId?: string | null;
    tag?: string | null;
    documentId?: string;
    duration?: number;
    task?: StartClassificationValidationTaskInfo;
    classificationResult?: ClassificationResult[] | null;
}

export interface TrackStartExtractionValidationRequest {
    extractorId?: string | null;
    tag?: string | null;
    documentTypeId?: string | null;
    documentId?: string;
    duration?: number;
    task?: StartExtractionValidationTaskInfo;
    extractionResult?: ExtractionResult;
}
