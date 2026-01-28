/**
 * Trace Types
 *
 * Types for trace spans and observability.
 * These types are used for tracking LLM calls, tool executions,
 * and other operations during conversational agent sessions.
 */

/**
 * Status of a trace span
 */
export enum TraceSpanStatus {
  /** Running or not yet started */
  Unset = 0,
  /** Completed successfully */
  Ok = 1,
  /** Completed with error */
  Error = 2,
  /** Currently running */
  Running = 3,
  /** Access restricted */
  Restricted = 4,
  /** Operation was cancelled */
  Cancelled = 5
}

/**
 * Attachment associated with a span
 */
export interface TraceSpanAttachment {
  /** Unique identifier for the attachment */
  id: string;
  /** Name of the attached file */
  fileName: string;
  /** MIME type of the attachment */
  mimeType: string;
}

/**
 * A trace span representing a single operation in a trace
 *
 * Spans are used for distributed tracing and observability of LLM operations.
 * They follow OpenTelemetry conventions for trace/span hierarchy.
 */
export interface TraceSpanGetResponse {
  /** Unique identifier for this span */
  id: string;
  /** Trace ID this span belongs to */
  traceId: string;
  /** Parent span ID (for hierarchical traces) */
  parentId?: string;
  /** Name of the operation (e.g., "LLM Call", "Tool Execution") */
  name: string;
  /** When the operation started (ISO 8601 format) */
  startTime: string;
  /** When the operation ended (ISO 8601 format) */
  endTime?: string;
  /** JSON string containing operation-specific attributes (model, tokens, prompts, etc.) */
  attributes: string;
  /** Current status of the span */
  status: TraceSpanStatus;
  /** Organization ID */
  organizationId: string;
  /** Tenant ID */
  tenantId: string;
  /** When this span expires (ISO 8601 format) */
  expiryTimeUtc?: string;
  /** Folder key for organization */
  folderKey?: string;
  /** Source identifier */
  source?: number;
  /** Type of span (e.g., "Conversation", "Exchange", "ToolCall") */
  spanType?: string;
  /** Process key if related to a UiPath process */
  processKey?: string;
  /** Job key if related to a UiPath job */
  jobKey?: string;
  /** Attachments associated with this span */
  attachments?: TraceSpanAttachment[];
}

/**
 * Raw span as returned from the API (before transformation)
 */
export interface RawTraceSpan {
  /** Unique identifier for this span */
  Id: string;
  /** Trace ID this span belongs to */
  TraceId: string;
  /** Parent span ID (for hierarchical traces) */
  ParentId?: string;
  /** Name of the operation */
  Name: string;
  /** When the operation started (ISO 8601 format) */
  StartTime: string;
  /** When the operation ended (ISO 8601 format) */
  EndTime?: string;
  /** Raw attributes object (not yet stringified) */
  Attributes: Record<string, unknown>;
  /** Current status of the span */
  Status: TraceSpanStatus;
  /** Organization ID */
  OrganizationId: string;
  /** Tenant ID */
  TenantId: string;
  /** When this span expires (ISO 8601 format) */
  ExpiryTimeUtc?: string;
  /** Folder key for organization */
  FolderKey?: string;
  /** Source identifier */
  Source?: number;
  /** Type of span */
  SpanType?: string;
  /** Process key if related to a UiPath process */
  ProcessKey?: string;
  /** Job key if related to a UiPath job */
  JobKey?: string;
  /** Attachments associated with this span */
  Attachments?: Array<{
    Id: string;
    FileName: string;
    MimeType: string;
  }>;
}

