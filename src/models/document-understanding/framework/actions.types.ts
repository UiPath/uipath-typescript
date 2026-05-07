// Auto-generated from the OpenAPI spec — do not edit manually.

export enum DocumentActionPriority {
    Low = 'Low',
    Medium = 'Medium',
    High = 'High',
    Critical = 'Critical',
}

export enum DocumentActionStatus {
    Unassigned = 'Unassigned',
    Pending = 'Pending',
    Completed = 'Completed',
}

export enum DocumentActionType {
    Validation = 'Validation',
    Classification = 'Classification',
}

export interface UserData {
    id?: number | null;
    emailAddress?: string | null;
}
