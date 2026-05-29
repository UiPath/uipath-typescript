/**
 * Raw span from GET /v2/spans/otel and POST /v2/spans/otel/byIds.
 * PascalCase keys, integer enums, Attributes is an object (not a string).
 */
export interface RawSpanOtelResponse {
  Id: string;
  TraceId: string;
  ParentId: string | null;
  Name: string | null;
  StartTime: string;
  EndTime: string | null;
  /** User-defined span attributes — do not transform keys. */
  Attributes: Record<string, unknown>;
  /** Integer status code — map via SpanStatusMap. */
  Status: number;
  OrganizationId: string;
  TenantId: string | null;
  ExpiryTimeUtc: string | null;
  FolderKey: string | null;
  /** Integer source code — map via SpanSourceMap. */
  Source: number | null;
  SpanType: string | null;
  ProcessKey: string | null;
  JobKey: string | null;
  ReferenceId: string | null;
  ReferenceVersion: string | null;
  /** Integer verbosity level — map via SpanVerbosityLevelMap. */
  VerbosityLevel: number | null;
  /** Integer execution type — map via SpanExecutionTypeMap. */
  ExecutionType: number | null;
  UpdatedAt: string;
  AgentVersion: string | null;
  Attachments: Array<{
    Provider: number;
    Id: string;
    FileName: string;
    MimeType: string;
    Direction: number;
  }> | null;
  /** Integer permission status — map via SpanPermissionStatusMap. */
  PermissionStatus: number | null;
  Context: {
    ReferenceHierarchy: Array<{
      ServiceType: string;
      ReferenceId: string;
      Version: string | null;
    }>;
  } | null;
}

/** Raw paginated response from the otel token-based endpoints. */
export interface RawSpanOtelPageResponse {
  Spans: RawSpanOtelResponse[];
  /** Continuation token for the next page (empty string when no further pages). */
  Tokens: string;
}

