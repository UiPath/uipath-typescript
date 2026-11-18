import type {
  AgentRunsDurations,
  AgentRunsJobCounts,
  AgentRunsSegment,
  AgentRunsStats,
  AgentRunsSummary,
  AgentRunsTimelineBucket,
  AgentRunsTopAgent,
} from './agents.types';

/**
 * Raw per-agent summary entry exactly as the agent-summary API returns it.
 */
export interface RawAgentSummaryEntry {
  processKey: string;
  folderKey: string;
  processVersion: string;
  totalJobs: number;
  successfulJobs: number;
  successRate: number;
  averageDurationSeconds: number;
  firstJobFinished: string;
  lastJobFinished: string;
  /** Raw status string of the most recent run. */
  lastJobStatus: string;
}

/**
 * Raw summary period exactly as the API returns it — its agents carry raw
 * `lastJobStatus` strings.
 */
export interface RawAgentSummaryPeriod {
  totalJobs: number;
  successfulJobs: number;
  successRate: number;
  averageDurationSeconds: number;
  startTime: string;
  endTime: string;
  agents: RawAgentSummaryEntry[];
}

/**
 * Raw agent summary response exactly as the API returns it, before
 * `lastJobStatus` normalization. The service transforms this into an
 * {@link AgentGetSummaryResponse}.
 */
export interface RawAgentGetSummaryResponse {
  currentPeriodSummary: RawAgentSummaryPeriod;
  lookbackPeriodSummary?: RawAgentSummaryPeriod;
}

/**
 * Raw runs-timeline bucket exactly as the API returns it, with its start under `bucket`.
 */
export interface RawAgentRunsBucket {
  bucket: string;
  jobs: AgentRunsJobCounts;
  errorRate: number;
  activeAgents: number;
  durationSeconds: AgentRunsDurations;
  segments?: Partial<Record<AgentRunsSegment, AgentRunsStats>>;
}

/**
 * Raw runs-timeline response envelope exactly as the API returns it.
 */
export interface RawAgentGetRunsTimelineResponse {
  data: {
    startTime: string;
    endTime: string;
    bucket?: AgentRunsTimelineBucket;
    timeZone: string;
    summary: AgentRunsSummary;
    buckets?: RawAgentRunsBucket[];
    topAgents?: AgentRunsTopAgent[];
  };
  hasError: boolean;
  errorMessage?: string;
}
