// Auto-generated from the OpenAPI spec — do not edit manually.

import type { ErrorResponse } from './helpers.types';
import type { ClassificationPrompt } from './model.types';
import type { ClassificationResult } from './results.types';

export interface ClassificationRequestBody {
    documentId?: string;
    prompts?: ClassificationPrompt[] | null;
}

export interface ClassificationResponse {
    classificationResults?: ClassificationResult[] | null;
}

export interface StartClassificationResponse {
    operationId?: string;
    resultUrl?: string | null;
}

export interface SwaggerGetClassificationResultResponse {
    status?: 'Succeeded' | 'Failed' | 'Running' | 'NotStarted';
    createdAt?: string;
    lastUpdatedAt?: string;
    error?: ErrorResponse;
    result?: ClassificationResponse;
}
