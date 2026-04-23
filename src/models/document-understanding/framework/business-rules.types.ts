// Auto-generated from the OpenAPI spec — do not edit manually.

import type {
    Criticality,
    FieldType,
    Rule,
} from './taxonomy.types';

export interface FieldValue {
    value?: string | null;
    derivedValue?: string | null;
}

export interface FieldValueResult {
    value?: FieldValue;
    isValid?: boolean;
    rules?: RuleResult[] | null;
}

export interface RuleResult {
    rule?: Rule;
    isValid?: boolean;
}

export interface RuleSetResult {
    fieldId?: string | null;
    fieldType?: FieldType;
    criticality?: Criticality;
    isValid?: boolean;
    results?: FieldValueResult[] | null;
    brokenRules?: Rule[] | null;
    rowIndex?: number | null;
    tableFieldId?: string | null;
}
