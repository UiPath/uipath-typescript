// Auto-generated from the OpenAPI spec — do not edit manually.

import type { DocumentTaxonomy } from './taxonomy.types';

export enum ModelKind {
    Classifier = 'Classifier',
    Extractor = 'Extractor',
}

export enum ModelType {
    IXP = 'IXP',
    Modern = 'Modern',
    Predefined = 'Predefined',
}

export interface FolderBasedStartExtractionRequest {
    documentId?: string;
    documentTaxonomy?: DocumentTaxonomy;
    pageRange?: string | null;
}

export interface FolderBasedStartExtractionResponse {
    operationId?: string;
    resultUrl?: string | null;
}

export interface FolderModelsResponse {
    folderKey?: string | null;
    fullyQualifiedName?: string | null;
    models?: ModelSummaryResponse[] | null;
}

export interface GetModelDetailsResponse {
    fullyQualifiedName?: string | null;
    kind?: ModelKind;
    type?: ModelType;
    description?: string | null;
    asyncDigitizationUrl?: string | null;
    asyncExtractionUrl?: string | null;
    documentTaxonomy?: DocumentTaxonomy;
}

export interface GetModelsResponse {
    folders?: FolderModelsResponse[] | null;
}

export interface ModelSummaryResponse {
    modelName?: string | null;
    description?: string | null;
    kind?: ModelKind;
    type?: ModelType;
    fullyQualifiedName?: string | null;
    detailsUrl?: string | null;
    asyncDigitizationUrl?: string | null;
    asyncExtractionUrl?: string | null;
}
