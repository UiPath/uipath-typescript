// Auto-generated from UiPath.DocumentProcessing.Contracts — do not edit manually.

export interface DuContentValidationData {
    BucketName: string;
    BucketId: number;
    FolderId: number;
    FolderKey?: string;
    DocumentId: string;
    DocumentPath: string;
    EncodedDocumentPath: string;
    TextPath: string;
    DocumentObjectModelPath: string;
    TaxonomyPath: string;
    AutomaticExtractionResultsPath: string;
    ValidatedExtractionResultsPath: string;
    ExtractorPayloadsPath: string;
    ShowOnlyRelevantPageRange: boolean;
    AdditionalDataPath: string;
    OriginalDocumentFileName: string;
    CustomizationInfoPath: string;
}

export interface DuDocumentActionData {
    Id: number | null;
    Status: DuDocumentActionStatus | null;
    Title: string;
    Priority: DuDocumentActionPriority | null;
    TaskCatalogName: string;
    FolderPath: string;
    FolderId: number | null;
    Data: unknown;
    Action: string;
    IsDeleted: boolean | null;
    AssignedToUser?: DuUserData;
    CreatorUser?: DuUserData;
    DeleterUser?: DuUserData;
    LastModifierUser?: DuUserData;
    CompletedByUser?: DuUserData;
    CreationTime: string | null;
    LastAssignedTime: string | null;
    CompletionTime: string | null;
    ProcessingTime: number | null;
}

export enum DuDocumentActionPriority {
    Low = 0,
    Medium = 1,
    High = 2,
    Critical = 3,
}

export enum DuDocumentActionStatus {
    Unassigned = 0,
    Pending = 1,
    Completed = 2,
}

export enum DuDocumentActionType {
    Validation = 2,
    Classification = 3,
}

export interface DuDocumentClassificationActionData extends DuDocumentActionData {
    Type?: DuDocumentActionType;
}

export interface DuDocumentValidationActionData extends DuDocumentActionData {
    Type?: DuDocumentActionType;
}

export interface DuUserData {
    Id: number | null;
    EmailAddress: string;
}

