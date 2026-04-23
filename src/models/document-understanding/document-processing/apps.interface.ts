// Auto-generated from UiPath.DocumentProcessing.Contracts — do not edit manually.

import type {
    DuResultsDataPoint,
    DuResultsValue,
} from './results.interface';
import type {
    DuCriticality,
    DuLogicalOperator,
} from './taxonomy.interface';

export interface DuEvaluatedBusinessRulesForFieldValue {
    FieldId: string;
    ParentFieldId: string;
    FieldName: string;
    Index: number;
    IsValid: boolean;
    Criticality?: DuCriticality;
    LogicalOperator?: DuLogicalOperator;
    Rules?: DuEvaluatedBusinessRuleDetails[];
}

export interface DuEvaluatedBusinessRuleDetails {
    RuleName: string;
    RuleMessage: string;
    IsValid: boolean;
}

export interface DuFieldValueDetails {
    Field: DuResultsDataPoint | null;
    FieldValueIndex: number;
    FieldValue: DuResultsValue | null;
}

