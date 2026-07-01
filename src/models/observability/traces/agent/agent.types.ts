import type { PaginationOptions } from '../../../../utils/pagination/types';
import { SpanExecutionType as AgentTraceExecutionType } from '../traces.types';

/**
 * Job execution mode filter — `Debug` (test runs) or `Runtime` (production runs).
 * Alias of {@link SpanExecutionType} (identical value set, shared across the traces module).
 */
export { AgentTraceExecutionType };

/**
 * Filter fields shared by the trace-level agent endpoints
 */
export interface AgentTraceFilterOptions {
  /** Inclusive lower bound for the query window. Omit to use the server default (1 year ago). */
  startTime?: Date;
  /** Exclusive upper bound for the query window. Omit to use the server default (now). */
  endTime?: Date;
  /** Folder keys to scope the query. Intersected with the user's accessible folders. */
  folderKeys?: string[];
  /** Filter to a single agent by ID. */
  agentId?: string;
  /** Filter to a specific agent version. */
  agentVersion?: string;
  /** Filter to a specific execution type. */
  executionType?: AgentTraceExecutionType;
}

/**
 * One point on the trace-level errors timeline — error count for a single
 * (error name, time bucket).
 */
export interface AgentTraceGetErrorsTimelineResponse {
  /** Error name / category for this time-slice. */
  name: string;
  /** Count of errors in this time bucket for this name. */
  value: number;
  /** Bucket timestamp. */
  date: string;
}

/**
 * Options for the trace-level errors timeline.
 */
export interface AgentTraceGetErrorsTimelineOptions extends AgentTraceFilterOptions {}

/**
 * One point on the trace-level latency timeline — a latency value for a single
 * (series, time bucket).
 */
export interface AgentTraceGetLatencyTimelineResponse {
  /** Series/grouping name for this latency point. */
  name: string;
  /** Latency value in decimal seconds for this series and time bucket. */
  value: number;
  /** Bucket timestamp. */
  date: string;
}

/**
 * Options for the trace-level latency timeline.
 */
export interface AgentTraceGetLatencyTimelineOptions extends AgentTraceFilterOptions {}

/**
 * Per-agent unit consumption totals over the requested window (trace-level) —
 * a flat per-(agent, version, folder) breakdown of Agent Units and Platform Units consumed.
 */
export interface AgentTraceGetUnitConsumptionResponse {
  /** Agent ID these totals belong to. */
  agentId: string;
  /** Folder key (GUID) the consumption was recorded in. */
  folderKey: string;
  /** Agent version these totals belong to. */
  agentVersion: string;
  /** Agent units consumed over the window. */
  agentUnitsConsumed: number;
  /** Platform units consumed over the window. */
  platformUnitsConsumed: number;
}

/**
 * Options for the trace-level per-agent unit consumption.
 */
export interface AgentTraceGetUnitConsumptionOptions extends AgentTraceFilterOptions {}

/**
 * A single span record from the trace store.
 */
export interface AgentSpanGetResponse {
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
  expiredTime: string | null;
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
 * Options for the spans-by-reference query.
 *
 * Composes the optional hierarchy/time filters with pagination options.
 */
export type AgentTraceGetSpansByReferenceOptions = PaginationOptions & {
  /** Optional trace scope — narrows the scan to a single trace. */
  traceId?: string;
  /** Restrict matches to hierarchy entries with this service type. */
  serviceType?: string;
  /** Restrict matches to hierarchy entries with this version. */
  version?: string;
  /** Inclusive lower bound on span start time. */
  startTime?: Date;
  /** Exclusive upper bound on span end time. */
  endTime?: Date;
  /** Execution type filter */
  executionType?: AgentTraceExecutionType;
};

// ─── Governance ─────────────────────────────────────────────────────

/**
 * Evaluation mode of a governance check.
 */
export enum AgentGovernanceMode {
  /** Policy evaluated and logged, but not enforced. */
  Audit = 'AUDIT',
  /** Policy evaluated and enforced. */
  Enforce = 'ENFORCE',
  /** Unrecognized or missing mode. */
  Unknown = 'Unknown',
}

/**
 * Verdict of a governance check (`Deny` = violation).
 */
export enum AgentGovernanceVerdict {
  /** Allowed — not a violation. */
  Allow = 'ALLOW',
  /** Denied — counts as a violation. */
  Deny = 'DENY',
  /** Unrecognized or missing verdict. */
  Unknown = 'Unknown',
}

/**
 * A single governance check — one policy's allow/deny decision for an agent run.
 */
export interface AgentGovernanceCheckGetResponse {
  /** Tenant ID (GUID). */
  tenantId: string | null;
  /** Decision window start time — ISO 8601, UTC. */
  startTime: string;
  /** Decision window end time — ISO 8601, UTC. */
  endTime: string | null;
  /** Trace ID (GUID). */
  traceId: string | null;
  /** Job key (GUID). */
  jobKey: string | null;
  /** Folder key (GUID). */
  folderKey: string | null;
  /** Runtime the evaluator ran in (context, not a filter). */
  source: string | null;
  /** Policy ID. */
  policyId: string | null;
  /** Policy display name. */
  policyName: string | null;
  /** Governance pack name. */
  packName: string | null;
  /** Governance hook (e.g. `BEFORE_MODEL`). */
  hook: string | null;
  /** Evaluation mode, normalized to {@link AgentGovernanceMode} ({@link AgentGovernanceMode.Unknown} when missing/unrecognized). */
  mode: AgentGovernanceMode;
  /** Enforcement action applied. `null` in audit mode (no action enforced). */
  actionApplied: string | null;
  /** Verdict, normalized to {@link AgentGovernanceVerdict} (`Deny` = violation). */
  evaluatorResult: AgentGovernanceVerdict;
  /** Human-readable reason. */
  reason: string | null;
  /** Resolved agent ID (GUID). */
  agentId: string | null;
  /** Agent display name. */
  agentName: string | null;
}

/**
 * Options for the governance checks query — optional filters plus pagination.
 */
export type AgentGovernanceChecksOptions = PaginationOptions & {
  /** Inclusive upper bound for the query window. Defaults to now when omitted. */
  endTime?: Date;
  /** Filter on the governance hook. */
  hook?: string;
  /** Filter on the verdict. */
  evaluatorResult?: AgentGovernanceVerdict;
  /** Filter on a single policy ID. */
  policyId?: string;
  /** Filter on a single agent by its project key. */
  agentId?: string;
  /** When `true`, restrict to violations (deny verdicts). */
  violationsOnly?: boolean;
};

/**
 * One breakdown entry in the governance summary — counts for a single key.
 */
export interface AgentGovernanceCountItem {
  /** The value this row groups by — the distinct hook, agent id, policy id, or pack name for this breakdown. */
  key: string | null;
  /** Display name (populated for the policy and agent breakdowns). */
  name: string | null;
  /** Number of decisions for this key. */
  count: number;
  /** Number of violations (deny verdicts) for this key. */
  violationCount: number;
}

/**
 * Sections the governance summary can compute. `action` and `mode` are opt-in.
 */
export enum AgentGovernanceSection {
  /** Scalar totals (`total`, `violations`). */
  Totals = 'totals',
  /** Breakdown by governance hook. */
  Hook = 'hook',
  /** Breakdown by agent. */
  Agent = 'agent',
  /** Breakdown by policy. */
  Policy = 'policy',
  /** Breakdown by governance pack. */
  Pack = 'pack',
  /** Breakdown by enforcement action (opt-in). */
  Action = 'action',
  /** Breakdown by evaluation mode (opt-in). */
  Mode = 'mode',
}

/**
 * Aggregated governance posture over the requested window.
 */
export interface AgentGovernanceGetSummaryResponse {
  /** Total decisions in the window. */
  total: number;
  /** Total violations (deny verdicts). */
  violations: number;
  /** Breakdown by governance hook. */
  byHook: AgentGovernanceCountItem[];
  /** Breakdown by agent. */
  byAgent: AgentGovernanceCountItem[];
  /** Breakdown by policy. */
  byPolicy: AgentGovernanceCountItem[];
  /** Breakdown by governance pack. */
  byPack: AgentGovernanceCountItem[];
  /** Breakdown by enforcement action. Empty unless `action` is requested in `sections`. */
  byAction: AgentGovernanceCountItem[];
  /** Breakdown by evaluation mode. Empty unless `mode` is requested in `sections`. */
  byMode: AgentGovernanceCountItem[];
}

/**
 * Options for the governance summary.
 */
export interface AgentGovernanceSummaryOptions {
  /** Inclusive upper bound for the query window. Defaults to now when omitted. */
  endTime?: Date;
  /** Top-N size for each breakdown. */
  topN?: number;
  /** Restrict totals and breakdowns to a single governance pack. */
  packName?: string;
  /**
   * Which sections to compute. Omit for the default set
   * (`totals`, `hook`, `agent`, `policy`, `pack`); `action` and `mode` are opt-in.
   */
  sections?: AgentGovernanceSection[];
}
