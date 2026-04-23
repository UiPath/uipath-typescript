// Auto-generated from UiPath.DocumentProcessing.Contracts — do not edit manually.

export enum DuComparisonOperator {
    Equals = 1,
    NotEquals = 2,
    Greater = 3,
    Less = 4,
    GreaterOrEqual = 5,
    LessOrEqual = 6,
}

export enum DuCriticality {
    Must = 1,
    Should = 2,
}

export interface DuDataSource {
    ResourceId: string;
    ElementFieldId: string;
}

export interface DuDocumentGroup {
    Name: string;
    Categories?: string[];
}

export interface DuDocumentTaxonomy {
    DataContractVersion: string;
    DocumentTypes?: DuDocumentType[];
    Groups?: DuDocumentGroup[];
    SupportedLanguages?: DuLanguageInfo[];
    ReportAsExceptionSettings?: DuReportAsExceptionSettings;
}

export interface DuDocumentType {
    DocumentTypeId: string;
    Group: string;
    Category: string;
    Name: string;
    OptionalUniqueIdentifier: string;
    TypeField?: DuTypeField;
    Fields?: DuField[];
    Metadata?: DuMetadataEntry[];
}

export interface DuExceptionReasonOption {
    ExceptionReason: string;
}

export interface DuField {
    FieldId: string;
    FieldName: string;
    IsMultiValue: boolean;
    Type?: DuFieldType;
    DeriveFieldsFormat: string;
    Components?: DuField[];
    SetValues?: string[];
    Metadata?: DuMetadataEntry[];
    RuleSet?: DuRuleSet;
    DefaultValue: string;
    DataSource?: DuDataSource;
}

export enum DuFieldType {
    Text = 0,
    Number = 1,
    Date = 2,
    Name = 3,
    Address = 4,
    Keyword = 5,
    Set = 6,
    Boolean = 7,
    Table = 9,
    Internal = 10,
    FieldGroup = 11,
    MonetaryQuantity = 12,
}

export interface DuLanguageInfo {
    Name: string;
    Code: string;
}

export enum DuLogicalOperator {
    AND = 1,
    OR = 2,
}

export interface DuMetadataEntry {
    Key: string;
    Value: string;
}

export interface DuReportAsExceptionSettings {
    ExceptionReasonOptions?: DuExceptionReasonOption[];
}

export interface DuRule {
    Name: string;
    Type?: DuRuleType;
    LogicalOperator?: DuLogicalOperator;
    ComparisonOperator?: DuComparisonOperator;
    Expression: string;
    SetValues?: string[];
}

export interface DuRuleSet {
    Criticality?: DuCriticality;
    Rules?: DuRule[];
}

export enum DuRuleType {
    Mandatory = 10,
    PossibleValues = 20,
    Regex = 30,
    StartsWith = 31,
    EndsWith = 32,
    FixedLength = 33,
    IsNumeric = 34,
    IsDate = 35,
    IsEmail = 36,
    Contains = 37,
    Expression = 50,
    TableExpression = 60,
    IsEmpty = 70,
}

export interface DuTypeField {
    FieldId: string;
    FieldName: string;
}

