// Auto-generated from the OpenAPI spec — do not edit manually.

export enum ComparisonOperator {
    Equals = 'Equals',
    NotEquals = 'NotEquals',
    Greater = 'Greater',
    Less = 'Less',
    GreaterOrEqual = 'GreaterOrEqual',
    LessOrEqual = 'LessOrEqual',
}

export enum Criticality {
    Must = 'Must',
    Should = 'Should',
}

export enum FieldType {
    Text = 'Text',
    Number = 'Number',
    Date = 'Date',
    Name = 'Name',
    Address = 'Address',
    Keyword = 'Keyword',
    Set = 'Set',
    Boolean = 'Boolean',
    Table = 'Table',
    Internal = 'Internal',
    FieldGroup = 'FieldGroup',
    MonetaryQuantity = 'MonetaryQuantity',
}

export enum LogicalOperator {
    AND = 'AND',
    OR = 'OR',
}

export enum RuleType {
    Mandatory = 'Mandatory',
    PossibleValues = 'PossibleValues',
    Regex = 'Regex',
    StartsWith = 'StartsWith',
    EndsWith = 'EndsWith',
    FixedLength = 'FixedLength',
    IsNumeric = 'IsNumeric',
    IsDate = 'IsDate',
    IsEmail = 'IsEmail',
    Contains = 'Contains',
    Expression = 'Expression',
    TableExpression = 'TableExpression',
    IsEmpty = 'IsEmpty',
}

export interface DataSource {
    ResourceId?: string | null;
    ElementFieldId?: string | null;
}

export interface DocumentGroup {
    Name?: string | null;
    Categories?: string[] | null;
}

export interface DocumentTaxonomy {
    DataContractVersion?: string | null;
    DocumentTypes?: DocumentTypeEntity[] | null;
    Groups?: DocumentGroup[] | null;
    SupportedLanguages?: LanguageInfo[] | null;
    ReportAsExceptionSettings?: ReportAsExceptionSettings;
}

export interface DocumentTypeEntity {
    DocumentTypeId?: string | null;
    Group?: string | null;
    Category?: string | null;
    Name?: string | null;
    OptionalUniqueIdentifier?: string | null;
    TypeField?: TypeField;
    Fields?: Field[] | null;
    Metadata?: MetadataEntry[] | null;
}

export interface ExceptionReasonOption {
    ExceptionReason?: string | null;
}

export interface Field {
    FieldId?: string | null;
    FieldName?: string | null;
    IsMultiValue?: boolean;
    Type?: FieldType;
    DeriveFieldsFormat?: string | null;
    Components?: Field[] | null;
    SetValues?: string[] | null;
    Metadata?: MetadataEntry[] | null;
    RuleSet?: RuleSet;
    DefaultValue?: string | null;
    DataSource?: DataSource;
}

export interface LanguageInfo {
    Name?: string | null;
    Code?: string | null;
}

export interface MetadataEntry {
    Key?: string | null;
    Value?: string | null;
}

export interface ReportAsExceptionSettings {
    ExceptionReasonOptions?: ExceptionReasonOption[] | null;
}

export interface Rule {
    Name?: string | null;
    Type?: RuleType;
    LogicalOperator?: LogicalOperator;
    ComparisonOperator?: ComparisonOperator;
    Expression?: string | null;
    SetValues?: string[] | null;
}

export interface RuleSet {
    Criticality?: Criticality;
    Rules?: Rule[] | null;
}

export interface TypeField {
    FieldId?: string | null;
    FieldName?: string | null;
}
