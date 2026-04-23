// Auto-generated from UiPath.DocumentProcessing.Contracts — do not edit manually.

import type {
    DuCriticality,
    DuFieldType,
    DuRule,
} from './taxonomy.interface';

export interface DuFieldValue {
    Value: string;
    DerivedValue: string;
}

export interface DuFieldValueResult {
    Value?: DuFieldValue;
    IsValid: boolean;
    Rules?: DuRuleResult[];
}

export interface DuRuleResult {
    Rule?: DuRule;
    IsValid: boolean;
}

export interface DuRuleSetResult {
    FieldId: string;
    FieldType?: DuFieldType;
    Criticality?: DuCriticality;
    IsValid: boolean;
    Results?: DuFieldValueResult[];
    BrokenRules?: DuRule[];
    RowIndex: number | null;
    TableFieldId: string;
}

