/**
 * LLM Ops Types
 *
 * Types for LLM Operations tracing and observability.
 * These types are used for tracking LLM calls, tool executions,
 * and other operations during conversational agent sessions.
 */

/**
 * Status of an LLM Ops span
 */
export enum LlmOpsSpanStatus {
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
export interface SpanAttachment {
  /** Unique identifier for the attachment */
  Id: string;
  /** Name of the attached file */
  FileName: string;
  /** MIME type of the attachment */
  MimeType: string;
}

/**
 * An LLM Operations span representing a single operation in a trace
 *
 * Spans are used for distributed tracing and observability of LLM operations.
 * They follow OpenTelemetry conventions for trace/span hierarchy.
 */
export interface LlmOpsSpan {
  /** Unique identifier for this span */
  Id: string;
  /** Trace ID this span belongs to */
  TraceId: string;
  /** Parent span ID (for hierarchical traces) */
  ParentId?: string;
  /** Name of the operation (e.g., "LLM Call", "Tool Execution") */
  Name: string;
  /** When the operation started (ISO 8601 format) */
  StartTime: string;
  /** When the operation ended (ISO 8601 format) */
  EndTime?: string;
  /** JSON string containing operation-specific attributes (model, tokens, prompts, etc.) */
  Attributes: string;
  /** Current status of the span */
  Status: LlmOpsSpanStatus;
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
  /** Type of span (e.g., "Conversation", "Exchange", "ToolCall") */
  SpanType?: string;
  /** Process key if related to a UiPath process */
  ProcessKey?: string;
  /** Job key if related to a UiPath job */
  JobKey?: string;
  /** Attachments associated with this span */
  Attachments?: SpanAttachment[];
}

/**
 * Raw span as returned from the API (before Attributes transformation)
 */
export interface RawLlmOpsSpan extends Omit<LlmOpsSpan, 'Attributes'> {
  /** Raw attributes object (not yet stringified) */
  Attributes: Record<string, unknown>;
}
