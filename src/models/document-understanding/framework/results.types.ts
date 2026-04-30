// Auto-generated from the OpenAPI spec — do not edit manually.

import type { RuleSetResult } from './business-rules.types';
import type { TextType } from './dom.types';
import type { FieldType } from './taxonomy.types';

export enum ResultsDataSource {
    Automatic = 'Automatic',
    Manual = 'Manual',
    ManuallyChanged = 'ManuallyChanged',
    Defaulted = 'Defaulted',
    External = 'External',
}

export interface ClassificationResult {
    documentTypeId?: string | null;
    documentId?: string | null;
    confidence?: number;
    ocrConfidence?: number;
    reference?: ResultsContentReference;
    documentBounds?: ResultsDocumentBounds;
    classifierName?: string | null;
}

export interface ExtractionResult {
    documentId?: string | null;
    resultsVersion?: number;
    resultsDocument?: ResultsDocument;
    extractorPayloads?: ExtractorPayload[] | null;
    businessRulesResults?: RuleSetResult[] | null;
}

export interface ExtractorPayload {
    id?: string | null;
    payload?: string | null;
    savedPayloadId?: string | null;
    taxonomySchemaMapping?: string | null;
}

export interface ResultsContentReference {
    textStartIndex?: number;
    textLength?: number;
    tokens?: ResultsValueTokens[] | null;
}

export interface ResultsDataPoint {
    fieldId?: string | null;
    fieldName?: string | null;
    fieldType?: FieldType;
    isMissing?: boolean;
    dataSource?: ResultsDataSource;
    values?: ResultsValue[] | null;
    dataVersion?: number;
    operatorConfirmed?: boolean;
    validatorNotes?: string | null;
    validatorNotesInfo?: string | null;
}

export interface ResultsDerivedField {
    fieldId?: string | null;
    value?: string | null;
}

export interface ResultsDocument {
    bounds?: ResultsDocumentBounds;
    language?: string | null;
    documentGroup?: string | null;
    documentCategory?: string | null;
    documentTypeId?: string | null;
    documentTypeName?: string | null;
    documentTypeDataVersion?: number;
    dataVersion?: number;
    documentTypeSource?: ResultsDataSource;
    documentTypeField?: ResultsValue;
    fields?: ResultsDataPoint[] | null;
    tables?: ResultsTable[] | null;
}

export interface ResultsDocumentBounds {
    startPage?: number;
    pageCount?: number;
    textStartIndex?: number;
    textLength?: number;
    pageRange?: string | null;
}

export interface ResultsTable {
    fieldId?: string | null;
    fieldName?: string | null;
    isMissing?: boolean;
    dataSource?: ResultsDataSource;
    dataVersion?: number;
    operatorConfirmed?: boolean;
    values?: ResultsTableValue[] | null;
    validatorNotes?: string | null;
    validatorNotesInfo?: string | null;
}

export interface ResultsTableCell {
    rowIndex?: number;
    columnIndex?: number;
    isHeader?: boolean;
    isMissing?: boolean;
    operatorConfirmed?: boolean;
    dataSource?: ResultsDataSource;
    dataVersion?: number;
    values?: ResultsValue[] | null;
}

export interface ResultsTableColumnInfo {
    fieldId?: string | null;
    fieldName?: string | null;
    fieldType?: FieldType;
}

export interface ResultsTableValue {
    operatorConfirmed?: boolean;
    confidence?: number;
    ocrConfidence?: number;
    cells?: ResultsTableCell[] | null;
    columnInfo?: ResultsTableColumnInfo[] | null;
    numberOfRows?: number;
    validatorNotes?: string | null;
    validatorNotesInfo?: string | null;
}

export interface ResultsValue {
    components?: ResultsDataPoint[] | null;
    value?: string | null;
    unformattedValue?: string | null;
    reference?: ResultsContentReference;
    derivedFields?: ResultsDerivedField[] | null;
    confidence?: number;
    operatorConfirmed?: boolean;
    ocrConfidence?: number;
    textType?: TextType;
    validatorNotes?: string | null;
    validatorNotesInfo?: string | null;
}

export interface ResultsValueTokens {
    textStartIndex?: number;
    textLength?: number;
    page?: number;
    pageWidth?: number;
    pageHeight?: number;
    boxes?: number[][] | null;
}
