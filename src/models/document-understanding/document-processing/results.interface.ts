// Auto-generated from UiPath.DocumentProcessing.Contracts — do not edit manually.

import type { DuRuleSetResult } from './business-rules.interface';
import type {
    DuBox,
    DuDocument,
    DuTextType,
} from './dom.interface';
import type { DuFieldType } from './taxonomy.interface';

export interface DuClassificationResult {
    DocumentTypeId: string;
    DocumentId: string;
    Confidence: number;
    OcrConfidence: number;
    Reference?: DuResultsContentReference;
    DocumentBounds?: DuResultsDocumentBounds;
    ClassifierName: string;
}

export interface DuDocumentSplittingResult {
    DocumentObjectModel?: DuDocument;
    FilePath: string;
    Text: string;
    SplitConfidence: number;
}

export interface DuExtractionResult {
    DocumentId: string;
    ResultsVersion: number;
    ResultsDocument?: DuResultsDocument;
    ExtractorPayloads?: DuExtractorPayload[];
    BusinessRulesResults?: DuRuleSetResult[];
}

export interface DuExtractorPayload {
    Id: string;
    Payload: string;
    SavedPayloadId: string;
    TaxonomySchemaMapping: string;
}

export interface DuFieldGroupField {
    FieldId: string;
    FieldName: string;
    FieldGroupFieldValues?: DuFieldGroupFieldValue[];
}

export interface DuFieldGroupFieldValue {
    SimpleFieldValuesById?: Record<string, DuSimpleFieldValue[]>;
    SimpleFieldValuesByName?: Record<string, DuSimpleFieldValue[]>;
    TablesById?: Record<string, DuTableField>;
    TablesByName?: Record<string, DuTableField>;
    FieldGroupsById?: Record<string, DuFieldGroupField>;
    FieldGroupsByName?: Record<string, DuFieldGroupField>;
    Confidence: number;
    OcrConfidence: number;
}

export interface DuResultsContentReference {
    TextStartIndex: number;
    TextLength: number;
    Tokens?: DuResultsValueTokens[];
}

export interface DuResultsDataPoint {
    FieldId: string;
    FieldName: string;
    FieldType?: DuFieldType;
    IsMissing: boolean;
    DataSource?: DuResultsDataSource;
    Values?: DuResultsValue[];
    DataVersion: number;
    OperatorConfirmed: boolean;
    ValidatorNotes: string;
    ValidatorNotesInfo: string;
}

export enum DuResultsDataSource {
    Automatic = 0,
    Manual = 1,
    ManuallyChanged = 2,
    Defaulted = 3,
    External = 4,
}

export interface DuResultsDerivedField {
    FieldId: string;
    Value: string;
}

export interface DuResultsDocument {
    Bounds?: DuResultsDocumentBounds;
    Language: string;
    DocumentGroup: string;
    DocumentCategory: string;
    DocumentTypeId: string;
    DocumentTypeName: string;
    DocumentTypeDataVersion: number;
    DataVersion: number;
    DocumentTypeSource?: DuResultsDataSource;
    DocumentTypeField?: DuResultsValue;
    Fields?: DuResultsDataPoint[];
    Tables?: DuResultsTable[];
}

export interface DuResultsDocumentBounds {
    StartPage: number;
    PageCount: number;
    TextStartIndex: number;
    TextLength: number;
    PageRange: string;
}

export interface DuResultsTable {
    FieldId: string;
    FieldName: string;
    IsMissing: boolean;
    DataSource?: DuResultsDataSource;
    DataVersion: number;
    OperatorConfirmed: boolean;
    Values?: DuResultsTableValue[];
    ValidatorNotes: string;
    ValidatorNotesInfo: string;
}

export interface DuResultsTableCell {
    RowIndex: number;
    ColumnIndex: number;
    IsHeader: boolean;
    IsMissing: boolean;
    OperatorConfirmed: boolean;
    DataSource?: DuResultsDataSource;
    DataVersion: number;
    Values?: DuResultsValue[];
}

export interface DuResultsTableColumnInfo {
    FieldId: string;
    FieldName: string;
    FieldType?: DuFieldType;
}

export interface DuResultsTableValue {
    OperatorConfirmed: boolean;
    Confidence: number;
    OcrConfidence: number;
    Cells?: DuResultsTableCell[];
    ColumnInfo?: DuResultsTableColumnInfo[];
    NumberOfRows: number;
    ValidatorNotes: string;
    ValidatorNotesInfo: string;
}

export interface DuResultsValue {
    Components?: DuResultsDataPoint[];
    Value: string;
    UnformattedValue: string;
    Reference?: DuResultsContentReference;
    DerivedFields?: DuResultsDerivedField[];
    Confidence: number;
    OperatorConfirmed: boolean;
    OcrConfidence: number;
    TextType?: DuTextType;
    ValidatorNotes: string;
    ValidatorNotesInfo: string;
}

export interface DuResultsValueTokens {
    TextStartIndex: number;
    TextLength: number;
    Page: number;
    PageWidth: number;
    PageHeight: number;
    Boxes?: DuBox[];
}

export interface DuSimpleFieldValue {
    UnformattedValue: string;
    Value: string;
    RawValue: string;
    DerivedValue: string;
    Confidence: number;
    OcrConfidence: number;
}

export interface DuTableField {
    FieldId: string;
    FieldName: string;
    TableFieldValues?: DuTableFieldValue[];
    Confidence: number;
    OcrConfidence: number;
}

export interface DuTableFieldValue {
    UnformattedValue: string;
    Value: string;
    RawValue: string;
    DerivedValue: string;
    Confidence: number;
    OcrConfidence: number;
    ColumnId: string;
    ColumnName: string;
}

