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
  /** Tenant ID (GUID). */
  tenantId: string | null;
  /** Span retention expiry time. */
  expiryTimeUtc: string | null;
  /** Folder key (GUID) the span was recorded in. */
  folderKey: string | null;
  /** Span source. */
  source: string | null;
  /** Span type. */
  spanType: string | null;
  /** Process key (GUID). */
  processKey: string | null;
  /** Job key (GUID). */
  jobKey: string | null;
  /** Reference ID (GUID). */
  referenceId: string | null;
  /** Verbosity level. */
  verbosityLevel: string | null;
  /** Record last-updated time. */
  updatedAt: string;
  /** Whether the span payload is stored as a large payload. */
  isLargePayload: boolean;
  /** Payload compression type. */
  compressionType: string | null;
  /** Agent version that produced the span. */
  agentVersion: string | null;
  /** Raw span context as a JSON string. */
  context: string | null;
}

/**
 * Raw governance decision row as returned by the API, before the
 * `mode` and `evaluatorResult` fields are normalized to enums.
 */
export interface RawAgentGovernanceDecisionGetResponse {
  tenantId: string | null;
  startTime: string;
  endTime: string | null;
  traceId: string | null;
  jobKey: string | null;
  folderKey: string | null;
  source: string | null;
  policyId: string | null;
  policyName: string | null;
  packName: string | null;
  hook: string | null;
  /** Raw evaluation-mode string (e.g. `AUDIT`, `ENFORCE`). */
  mode: string | null;
  /** Raw enforcement-action string. */
  actionApplied: string | null;
  /** Raw verdict string (e.g. `ALLOW`, `DENY`). */
  evaluatorResult: string | null;
  reason: string | null;
  agentId: string | null;
  agentName: string | null;
}
