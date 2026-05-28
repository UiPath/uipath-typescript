// Auto-generated from the OpenAPI spec — do not edit manually.

import type { DocumentEntity } from './dom.types';
import type { ErrorResponse } from './helpers.types';
import type { JobStatus } from './model.types';

export interface StartDigitizationFromAttachmentModel {
    AttachmentId?: string;
    FolderId?: string | null;
    FileName?: string | null;
    MimeType?: string | null;
}

export interface StartDigitizationResponse {
    DocumentId?: string;
    ResultUrl?: string | null;
}

export interface SwaggerGetDigitizeJobResponse {
    Status?: JobStatus;
    Error?: ErrorResponse;
    Result?: SwaggerGetDigitizeJobResult;
    CreatedAt?: string;
    LastUpdatedAt?: string;
}

export interface SwaggerGetDigitizeJobResult {
    DocumentObjectModel?: DocumentEntity;
    DocumentText?: string | null;
}
