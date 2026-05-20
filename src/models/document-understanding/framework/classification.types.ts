// Auto-generated from the OpenAPI spec — do not edit manually.

import type { ClassificationPrompt } from './model.types';
import type { ClassificationResult } from './results.types';

export interface ClassificationRequestBody {
    DocumentId?: string;
    Prompts?: ClassificationPrompt[] | null;
}

export interface ClassificationResponse {
    ClassificationResults?: ClassificationResult[] | null;
}

export interface StartClassificationResponse {
    OperationId?: string;
    ResultUrl?: string | null;
}
