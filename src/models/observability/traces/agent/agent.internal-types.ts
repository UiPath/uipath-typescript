/**
 * Raw span record as returned by the API, before the
 * `expiryTimeUtc` → `expiredTime` rename.
 */
export interface RawAgentSpanGetResponse {
  /** Span ID. */
  id: string;
  /** ID of the trace this span belongs to. */
  traceId: string;
  /** Parent span ID. `null` for a root span. */
  parentId: string | null;
  /** Span name. */
  name: string;
  /** Span start time. */
  startTime: string;
  /** Span end time. `null` while the span is in progress. */
  endTime: string | null;
  /** Raw span attributes as a JSON string. */
  attributes: string;
  /** Span status. */
  status: string;
  /** Organization ID (GUID). */
  organizationId: string;
  /** Tenant ID (GUID). May be `null`. */
  tenantId: string | null;
  /** Span retention expiry time. May be `null`. */
  expiryTimeUtc: string | null;
  /** Folder key (GUID) the span was recorded in. May be `null`. */
  folderKey: string | null;
  /** Span source. May be `null`. */
  source: string | null;
  /** Span type. May be `null`. */
  spanType: string | null;
  /** Process key (GUID). May be `null`. */
  processKey: string | null;
  /** Job key (GUID). May be `null`. */
  jobKey: string | null;
  /** Reference ID (GUID). May be `null`. */
  referenceId: string | null;
  /** Verbosity level. May be `null`. */
  verbosityLevel: string | null;
  /** Record last-updated time. */
  updatedAt: string;
  /** Whether the span payload is stored as a large payload. */
  isLargePayload: boolean;
  /** Payload compression type. May be `null`. */
  compressionType: string | null;
  /** Agent version that produced the span. May be `null`. */
  agentVersion: string | null;
  /** Raw span context as a JSON string. May be `null`. */
  context: string | null;
}
