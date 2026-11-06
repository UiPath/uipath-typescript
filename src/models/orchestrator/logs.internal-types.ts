/**
 * Wire shape of one log entry as Orchestrator's SubmitLogs endpoint parses it. Each entry is
 * JSON-serialised into a string before the array of strings is posted.
 */
export interface LogEntryWire {
  message: string;
  /** Level name; Orchestrator parses it case-insensitively. */
  level: string;
  /** ISO-8601 timestamp; epoch numbers are rejected. */
  timeStamp: string;
  /** Per-entry GUID that Orchestrator de-duplicates on. */
  fingerprint: string;
  logType?: string;
  processName?: string;
  processVersion?: string;
  fileName?: string;
  jobId?: string;
  robotName?: string;
  machineName?: string;
  windowsIdentity?: string;
  agentSessionId?: string;
  /** Custom fields, kept verbatim and shown as custom log fields. */
  [key: string]: unknown;
}
