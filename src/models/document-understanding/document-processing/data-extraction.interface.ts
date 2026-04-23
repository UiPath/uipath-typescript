// Auto-generated from UiPath.DocumentProcessing.Contracts — do not edit manually.

import type {
    DuResultsDataPoint,
    DuResultsTable,
} from './results.interface';
import type { DuField } from './taxonomy.interface';

export interface DuExtractorDocumentType {
    DocumentTypeId: string;
    Fields?: DuField[];
    Metadata?: DuExtractorMetadata[];
}

export interface DuExtractorDocumentTypeCapabilities {
    DocumentTypeId: string;
    Fields?: DuExtractorFieldCapability[];
    Metadata?: DuExtractorMetadata[];
}

export interface DuExtractorFieldCapability {
    FieldId: string;
    Components?: DuExtractorFieldCapability[];
    SetValues?: string[];
}

export interface DuExtractorMetadata {
    Key: string;
    Value: string;
}

export interface DuExtractorResult {
    DataPoints?: DuResultsDataPoint[];
    Tables?: DuResultsTable[];
    Payload: string;
    SavedPayloadId: string;
    RequiresTaxonomySchemaMapping: boolean;
}

