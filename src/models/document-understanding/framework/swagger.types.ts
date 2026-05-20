// Auto-generated from the OpenAPI spec — do not edit manually.

import type { ClassificationResponse } from './classification.types';
import type { DocumentEntity } from './dom.types';
import type { ExtractSyncResult } from './extraction.types';
import type { ErrorResponse } from './helpers.types';
import type { JobStatus } from './model.types';

export interface GetClassificationResultResponse {
    Status?: JobStatus;
    CreatedAt?: string;
    LastUpdatedAt?: string;
    Error?: ErrorResponse;
    Result?: ClassificationResponse;
}

export interface GetDigitizeJobResponse {
    Status?: JobStatus;
    Error?: ErrorResponse;
    Result?: GetDigitizeJobResult;
    CreatedAt?: string;
    LastUpdatedAt?: string;
}

export interface GetDigitizeJobResult {
    DocumentObjectModel?: DocumentEntity;
    DocumentText?: string | null;
}

export interface GetExtractionResultResponse {
    Status?: JobStatus;
    CreatedAt?: string;
    LastUpdatedAt?: string;
    Error?: ErrorResponse;
    Result?: ExtractSyncResult;
}
