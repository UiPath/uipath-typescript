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

/**
 * Raw span from GET /spans/agent/{id} and GET /spans/reference/{id}.
 * camelCase keys, string enums, Attributes is also an object.
 */
export interface RawSpanAgentResponse {
  id: string;
  traceId: string;
  parentId: string | null;
  name: string | null;
  startTime: string;
  endTime: string | null;
  /** User-defined span attributes — do not transform keys. */
  attributes: Record<string, unknown>;
  /** String status value (e.g. `"Ok"`, `"Error"`, `"Unset"`). */
  status: string;
  organizationId: string;
  tenantId: string | null;
  expiryTimeUtc: string | null;
  folderKey: string | null;
  source: string | null;
  spanType: string | null;
  processKey: string | null;
  jobKey: string | null;
  referenceId: string | null;
  verbosityLevel: string | null;
  updatedAt: string;
  isLargePayload: boolean;
  compressionType: string | null;
  agentVersion: string | null;
}

/** Pagination metadata from the agent/reference endpoints. */
export interface RawSpanAgentPagination {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

/** Raw paginated response from the agent and reference span endpoints. */
export interface RawSpanAgentPageResponse {
  data: RawSpanAgentResponse[];
  pagination: RawSpanAgentPagination;
}
