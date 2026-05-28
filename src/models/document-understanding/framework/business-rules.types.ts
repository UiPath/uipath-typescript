// Auto-generated from the OpenAPI spec — do not edit manually.

import type {
    Criticality,
    FieldType,
    Rule,
} from './taxonomy.types';

export interface FieldValue {
    Value?: string | null;
    DerivedValue?: string | null;
}

export interface FieldValueResult {
    Value?: FieldValue;
    IsValid?: boolean;
    Rules?: RuleResult[] | null;
}

export interface RuleResult {
    Rule?: Rule;
    IsValid?: boolean;
}

export interface RuleSetResult {
    FieldId?: string | null;
    FieldType?: FieldType;
    Criticality?: Criticality;
    IsValid?: boolean;
    Results?: FieldValueResult[] | null;
    BrokenRules?: Rule[] | null;
    RowIndex?: number | null;
    TableFieldId?: string | null;
}
