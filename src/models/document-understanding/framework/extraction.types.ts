// Auto-generated from the OpenAPI spec — do not edit manually.

import type { GptFieldType } from './model.types';
import type { ExtractionResult } from './results.types';
import type { DocumentTaxonomy } from './taxonomy.types';

export interface ExtractionPromptRequestBody {
    Id?: string | null;
    Question?: string | null;
    FieldType?: GptFieldType;
    MultiValued?: boolean | null;
}

export interface ExtractRequestBodyConfiguration {
    AutoValidationConfidenceThreshold?: number | null;
}

export interface ExtractRequestBodyV2_0 {
    DocumentId?: string;
    PageRange?: string | null;
    Prompts?: ExtractionPromptRequestBody[] | null;
    Configuration?: ExtractRequestBodyConfiguration;
    DocumentTaxonomy?: DocumentTaxonomy;
}

export interface ExtractSyncResult {
    ExtractionResult?: ExtractionResult;
}

export interface StartExtractionResponse {
    OperationId?: string;
    ResultUrl?: string | null;
}
