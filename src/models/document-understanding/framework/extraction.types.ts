// Auto-generated from the OpenAPI spec — do not edit manually.

import type { ErrorResponse } from './helpers.types';
import type { GptFieldType } from './model.types';
import type { ExtractionResult } from './results.types';
import type { DocumentTaxonomy } from './taxonomy.types';

export interface ExtractionPromptRequestBody {
    id?: string | null;
    question?: string | null;
    fieldType?: GptFieldType;
    multiValued?: boolean | null;
}

export interface ExtractRequestBodyConfiguration {
    autoValidationConfidenceThreshold?: number | null;
}

export interface ExtractRequestBodyV2_0 {
    documentId?: string;
    pageRange?: string | null;
    prompts?: ExtractionPromptRequestBody[] | null;
    configuration?: ExtractRequestBodyConfiguration;
    documentTaxonomy?: DocumentTaxonomy;
}

export interface ExtractSyncResult {
    extractionResult?: ExtractionResult;
}

export interface StartExtractionResponse {
    operationId?: string;
    resultUrl?: string | null;
}

export interface SwaggerGetExtractionResultResponse {
    status?: 'Succeeded' | 'Failed' | 'Running' | 'NotStarted';
    createdAt?: string;
    lastUpdatedAt?: string;
    error?: ErrorResponse;
    result?: ExtractSyncResult;
}
