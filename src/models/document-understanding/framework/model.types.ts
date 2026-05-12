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

export enum JobStatus {
    Succeeded = 'Succeeded',
    Failed = 'Failed',
    Running = 'Running',
    NotStarted = 'NotStarted',
}

export enum ValidationDisplayMode {
    Classic = 'Classic',
    Compact = 'Compact',
}

export interface ClassificationPrompt {
    Name?: string | null;
    Description?: string | null;
}

export interface ClassificationValidationConfiguration {
    EnablePageReordering?: boolean;
}

export interface ContentValidationData {
    BucketName?: string | null;
    BucketId?: number;
    FolderId?: number;
    FolderKey?: string;
    DocumentId?: string;
    EncodedDocumentPath?: string | null;
    TextPath?: string | null;
    DocumentObjectModelPath?: string | null;
    TaxonomyPath?: string | null;
    AutomaticExtractionResultsPath?: string | null;
    ValidatedExtractionResultsPath?: string | null;
    CustomizationInfoPath?: string | null;
}

export interface DocumentClassificationActionDataModel {
    Id?: number | null;
    Status?: DocumentActionStatus;
    Title?: string | null;
    Priority?: DocumentActionPriority;
    TaskCatalogName?: string | null;
    TaskUrl?: string | null;
    FolderPath?: string | null;
    FolderId?: number | null;
    Data?: unknown | null;
    Action?: string | null;
    IsDeleted?: boolean | null;
    AssignedToUser?: UserData;
    CreatorUser?: UserData;
    DeleterUser?: UserData;
    LastModifierUser?: UserData;
    CompletedByUser?: UserData;
    CreationTime?: string | null;
    LastAssignedTime?: string | null;
    CompletionTime?: string | null;
    ProcessingTime?: number | null;
    Type?: DocumentActionType;
}

export interface DocumentExtractionActionDataModel {
    Id?: number | null;
    Status?: DocumentActionStatus;
    Title?: string | null;
    Priority?: DocumentActionPriority;
    TaskCatalogName?: string | null;
    TaskUrl?: string | null;
    FolderPath?: string | null;
    FolderId?: number | null;
    Data?: unknown | null;
    Action?: string | null;
    IsDeleted?: boolean | null;
    AssignedToUser?: UserData;
    CreatorUser?: UserData;
    DeleterUser?: UserData;
    LastModifierUser?: UserData;
    CompletedByUser?: UserData;
    CreationTime?: string | null;
    LastAssignedTime?: string | null;
    CompletionTime?: string | null;
    ProcessingTime?: number | null;
    Type?: DocumentActionType;
}

export interface ExtractionPrompt {
    Id?: string | null;
    Question?: string | null;
    FieldType?: GptFieldType;
    MultiValued?: boolean | null;
}

export interface ExtractionValidationConfigurationV2 {
    EnableRtlControls?: boolean;
    DisplayMode?: ValidationDisplayMode;
    FieldsValidationConfidence?: number | null;
    AllowChangeOfDocumentType?: boolean | null;
}

export interface FieldGroupValueProjection {
    FieldGroupName?: string | null;
    FieldValues?: FieldValueProjection[] | null;
}

export interface FieldValueProjection {
    Id?: string | null;
    Name?: string | null;
    Value?: string | null;
    UnformattedValue?: string | null;
    Confidence?: number | null;
    OcrConfidence?: number | null;
    Type?: FieldType;
}
