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
    DocumentTypeId?: string | null;
    DocumentId?: string | null;
    Confidence?: number;
    OcrConfidence?: number;
    Reference?: ResultsContentReference;
    DocumentBounds?: ResultsDocumentBounds;
    ClassifierName?: string | null;
}

export interface ExtractionResult {
    DocumentId?: string | null;
    ResultsVersion?: number;
    ResultsDocument?: ResultsDocument;
    ExtractorPayloads?: ExtractorPayload[] | null;
    BusinessRulesResults?: RuleSetResult[] | null;
}

export interface ExtractorPayload {
    Id?: string | null;
    Payload?: string | null;
    SavedPayloadId?: string | null;
    TaxonomySchemaMapping?: string | null;
}

export interface ResultsContentReference {
    TextStartIndex?: number;
    TextLength?: number;
    Tokens?: ResultsValueTokens[] | null;
}

export interface ResultsDataPoint {
    FieldId?: string | null;
    FieldName?: string | null;
    FieldType?: FieldType;
    IsMissing?: boolean;
    DataSource?: ResultsDataSource;
    Values?: ResultsValue[] | null;
    DataVersion?: number;
    OperatorConfirmed?: boolean;
    ValidatorNotes?: string | null;
    ValidatorNotesInfo?: string | null;
}

export interface ResultsDerivedField {
    FieldId?: string | null;
    Value?: string | null;
}

export interface ResultsDocument {
    Bounds?: ResultsDocumentBounds;
    Language?: string | null;
    DocumentGroup?: string | null;
    DocumentCategory?: string | null;
    DocumentTypeId?: string | null;
    DocumentTypeName?: string | null;
    DocumentTypeDataVersion?: number;
    DataVersion?: number;
    DocumentTypeSource?: ResultsDataSource;
    DocumentTypeField?: ResultsValue;
    Fields?: ResultsDataPoint[] | null;
    Tables?: ResultsTable[] | null;
}

export interface ResultsDocumentBounds {
    PageCount?: number;
    PageRange?: string | null;
}

export interface ResultsTable {
    FieldId?: string | null;
    FieldName?: string | null;
    IsMissing?: boolean;
    DataSource?: ResultsDataSource;
    DataVersion?: number;
    OperatorConfirmed?: boolean;
    Values?: ResultsTableValue[] | null;
    ValidatorNotes?: string | null;
    ValidatorNotesInfo?: string | null;
}

export interface ResultsTableCell {
    RowIndex?: number;
    ColumnIndex?: number;
    IsHeader?: boolean;
    IsMissing?: boolean;
    OperatorConfirmed?: boolean;
    DataSource?: ResultsDataSource;
    DataVersion?: number;
    Values?: ResultsValue[] | null;
}

export interface ResultsTableColumnInfo {
    FieldId?: string | null;
    FieldName?: string | null;
    FieldType?: FieldType;
}

export interface ResultsTableValue {
    OperatorConfirmed?: boolean;
    Confidence?: number;
    OcrConfidence?: number;
    Cells?: ResultsTableCell[] | null;
    ColumnInfo?: ResultsTableColumnInfo[] | null;
    NumberOfRows?: number;
    ValidatorNotes?: string | null;
    ValidatorNotesInfo?: string | null;
}

export interface ResultsValue {
    Components?: ResultsDataPoint[] | null;
    Value?: string | null;
    UnformattedValue?: string | null;
    Reference?: ResultsContentReference;
    DerivedFields?: ResultsDerivedField[] | null;
    Confidence?: number;
    OperatorConfirmed?: boolean;
    OcrConfidence?: number;
    TextType?: TextType;
    ValidatorNotes?: string | null;
    ValidatorNotesInfo?: string | null;
}

export interface ResultsValueTokens {
    TextStartIndex?: number;
    TextLength?: number;
    Page?: number;
    PageWidth?: number;
    PageHeight?: number;
    Boxes?: number[][] | null;
}
