// Auto-generated from the OpenAPI spec — do not edit manually.

import type { DocumentTaxonomy } from './taxonomy.types';

export enum ModelKind {
    Extractor = 'Extractor',
    Classifier = 'Classifier',
}

export enum ModelType {
    IXP = 'IXP',
    Modern = 'Modern',
    Predefined = 'Predefined',
}

export interface FolderBasedStartExtractionRequest {
    DocumentId?: string;
    DocumentTaxonomy?: DocumentTaxonomy;
    PageRange?: string | null;
}

export interface FolderBasedStartExtractionResponse {
    OperationId?: string;
    ResultUrl?: string | null;
}

export interface FolderModelsResponse {
    FolderKey?: string | null;
    FullyQualifiedName?: string | null;
    Models?: ModelSummaryResponse[] | null;
}

export interface GetModelDetailsResponse {
    FullyQualifiedName?: string | null;
    ModelDisplayName?: string | null;
    Kind?: ModelKind;
    Type?: ModelType;
    Description?: string | null;
    AsyncDigitizationUrl?: string | null;
    AsyncExtractionUrl?: string | null;
    DocumentTaxonomy?: DocumentTaxonomy;
}

export interface GetModelsResponse {
    Folders?: FolderModelsResponse[] | null;
}

export interface ModelSummaryResponse {
    ModelName?: string | null;
    ModelDisplayName?: string | null;
    Description?: string | null;
    Kind?: ModelKind;
    Type?: ModelType;
    FullyQualifiedName?: string | null;
    DetailsUrl?: string | null;
    AsyncDigitizationUrl?: string | null;
    AsyncExtractionUrl?: string | null;
}
