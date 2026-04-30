// Auto-generated from the OpenAPI spec — do not edit manually.

import type { DocumentEntity } from './dom.types';
import type { ErrorResponse } from './helpers.types';

export interface StartDigitizationFromAttachmentModel {
    attachmentId?: string;
    folderId?: string | null;
    fileName?: string | null;
    mimeType?: string | null;
}

export interface StartDigitizationResponse {
    documentId?: string;
    resultUrl?: string | null;
}

export interface SwaggerGetDigitizeJobResponse {
    status?: 'Succeeded' | 'Failed' | 'Running' | 'NotStarted';
    error?: ErrorResponse;
    result?: SwaggerGetDigitizeJobResult;
    createdAt?: string;
    lastUpdatedAt?: string;
}

export interface SwaggerGetDigitizeJobResult {
    documentObjectModel?: DocumentEntity;
    documentText?: string | null;
}
