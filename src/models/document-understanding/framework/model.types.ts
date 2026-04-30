// Auto-generated from the OpenAPI spec — do not edit manually.

import type {
    DocumentActionPriority,
    DocumentActionStatus,
    DocumentActionType,
    UserData,
} from './actions.types';
import type { FieldType } from './taxonomy.types';

export enum ClassifierDocumentTypeType {
    FormsAi = 'FormsAi',
    SemiStructuredAi = 'SemiStructuredAi',
    Helix = 'Helix',
    Unknown = 'Unknown',
}

export enum CreateTaskPriority {
    Low = 'Low',
    Medium = 'Medium',
    High = 'High',
    Critical = 'Critical',
}

export enum GptFieldType {
    Address = 'Address',
    Boolean = 'Boolean',
    Date = 'Date',
    Name = 'Name',
    Number = 'Number',
    Text = 'Text',
}

export enum ValidationDisplayMode {
    Classic = 'Classic',
    Compact = 'Compact',
}

export interface ClassificationPrompt {
    name?: string | null;
    description?: string | null;
}

export interface ClassificationValidationConfiguration {
    enablePageReordering?: boolean;
}

export interface ContentValidationData {
    bucketName?: string | null;
    bucketId?: number;
    folderId?: number;
    folderKey?: string;
    documentId?: string;
    encodedDocumentPath?: string | null;
    textPath?: string | null;
    documentObjectModelPath?: string | null;
    taxonomyPath?: string | null;
    automaticExtractionResultsPath?: string | null;
    validatedExtractionResultsPath?: string | null;
    customizationInfoPath?: string | null;
}

export interface DocumentClassificationActionDataModel {
    id?: number | null;
    status?: DocumentActionStatus;
    title?: string | null;
    priority?: DocumentActionPriority;
    taskCatalogName?: string | null;
    taskUrl?: string | null;
    folderPath?: string | null;
    folderId?: number | null;
    data?: unknown | null;
    action?: string | null;
    isDeleted?: boolean | null;
    assignedToUser?: UserData;
    creatorUser?: UserData;
    deleterUser?: UserData;
    lastModifierUser?: UserData;
    completedByUser?: UserData;
    creationTime?: string | null;
    lastAssignedTime?: string | null;
    completionTime?: string | null;
    processingTime?: number | null;
    type?: DocumentActionType;
}

export interface DocumentExtractionActionDataModel {
    id?: number | null;
    status?: DocumentActionStatus;
    title?: string | null;
    priority?: DocumentActionPriority;
    taskCatalogName?: string | null;
    taskUrl?: string | null;
    folderPath?: string | null;
    folderId?: number | null;
    data?: unknown | null;
    action?: string | null;
    isDeleted?: boolean | null;
    assignedToUser?: UserData;
    creatorUser?: UserData;
    deleterUser?: UserData;
    lastModifierUser?: UserData;
    completedByUser?: UserData;
    creationTime?: string | null;
    lastAssignedTime?: string | null;
    completionTime?: string | null;
    processingTime?: number | null;
    type?: DocumentActionType;
}

export interface ExtractionPrompt {
    id?: string | null;
    question?: string | null;
    fieldType?: GptFieldType;
    multiValued?: boolean | null;
}

export interface ExtractionValidationConfigurationV2 {
    enableRtlControls?: boolean;
    displayMode?: ValidationDisplayMode;
    fieldsValidationConfidence?: number | null;
    allowChangeOfDocumentType?: boolean | null;
}

export interface FieldGroupValueProjection {
    fieldGroupName?: string | null;
    fieldValues?: FieldValueProjection[] | null;
}

export interface FieldValueProjection {
    id?: string | null;
    name?: string | null;
    value?: string | null;
    unformattedValue?: string | null;
    confidence?: number | null;
    ocrConfidence?: number | null;
    type?: FieldType;
}
