// Auto-generated from UiPath.DocumentProcessing.Contracts — do not edit manually.

import type { DuClassificationResult } from './results.interface';

export interface DuClassifierDocumentType {
    DocumentTypeId: string;
    Name: string;
}

export interface DuClassifierDocumentTypeCapability {
    DocumentType: string;
}

export interface DuClassifierResult {
    Classifications?: DuClassificationResult[];
}

