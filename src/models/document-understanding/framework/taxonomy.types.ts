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
    resourceId?: string | null;
    elementFieldId?: string | null;
}

export interface DocumentGroup {
    name?: string | null;
    categories?: string[] | null;
}

export interface DocumentTaxonomy {
    dataContractVersion?: string | null;
    documentTypes?: DocumentTypeEntity[] | null;
    groups?: DocumentGroup[] | null;
    supportedLanguages?: LanguageInfo[] | null;
    reportAsExceptionSettings?: ReportAsExceptionSettings;
}

export interface DocumentTypeEntity {
    documentTypeId?: string | null;
    group?: string | null;
    category?: string | null;
    name?: string | null;
    optionalUniqueIdentifier?: string | null;
    typeField?: TypeField;
    fields?: Field[] | null;
    metadata?: MetadataEntry[] | null;
}

export interface ExceptionReasonOption {
    exceptionReason?: string | null;
}

export interface Field {
    fieldId?: string | null;
    fieldName?: string | null;
    isMultiValue?: boolean;
    type?: FieldType;
    deriveFieldsFormat?: string | null;
    components?: Field[] | null;
    setValues?: string[] | null;
    metadata?: MetadataEntry[] | null;
    ruleSet?: RuleSet;
    defaultValue?: string | null;
    dataSource?: DataSource;
}

export interface LanguageInfo {
    name?: string | null;
    code?: string | null;
}

export interface MetadataEntry {
    key?: string | null;
    value?: string | null;
}

export interface ReportAsExceptionSettings {
    exceptionReasonOptions?: ExceptionReasonOption[] | null;
}

export interface Rule {
    name?: string | null;
    type?: RuleType;
    logicalOperator?: LogicalOperator;
    comparisonOperator?: ComparisonOperator;
    expression?: string | null;
    setValues?: string[] | null;
}

export interface RuleSet {
    criticality?: Criticality;
    rules?: Rule[] | null;
}

export interface TypeField {
    fieldId?: string | null;
    fieldName?: string | null;
}
