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
