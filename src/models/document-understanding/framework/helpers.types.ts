// Auto-generated from the OpenAPI spec — do not edit manually.

export enum ErrorSeverity {
    Info = 'Info',
    Warning = 'Warning',
    Error = 'Error',
}

export interface ErrorResponse {
    Message?: string | null;
    Severity?: ErrorSeverity;
    Code?: string | null;
    Parameters?: string[] | null;
}
