import type { FolderScopingOnly } from '../common/types';

/**
 * Severity of a log entry — the level names Orchestrator stores and shows in the Logs view.
 */
export enum LogEntryLevel {
  /** Most verbose diagnostics. */
  Trace = 'Trace',
  /** Debugging detail. */
  Debug = 'Debug',
  /** Normal operation (the default). */
  Info = 'Info',
  /** Something unexpected that did not stop the operation. */
  Warn = 'Warn',
  /** A failure of the current operation. Error and Fatal entries drive Orchestrator's error monitoring. */
  Error = 'Error',
  /** An unrecoverable failure. */
  Fatal = 'Fatal',
}

/**
 * Origin of a log entry.
 */
export enum LogEntryType {
  /** Runtime or system entries (the default). */
  Default = 'Default',
  /** Entries written explicitly by an automation, e.g. the Log Message activity. */
  User = 'User',
}

/**
 * One execution-log entry for {@link LogServiceModel.submit}.
 *
 * `message` is required; everything else is optional. Orchestrator validates entries silently:
 * an entry whose `timestamp` is more than 30 days in the past or more than 24 hours in the
 * future, whose serialised form exceeds 512 KB, or which carries one of the reserved property
 * names `@rawMessage`, `@encryption` or `@compression` is discarded without an error while the
 * request still succeeds.
 */
export interface LogEntry {
  /** Log text, shown in the Message column. Required. */
  message: string;
  /** Severity. Defaults to {@link LogEntryLevel.Info}. */
  level?: LogEntryLevel;
  /**
   * When the event happened. Defaults to the current time. Must fall within the last 30 days or
   * the next 24 hours, or Orchestrator discards the entry without an error.
   */
  timestamp?: Date;
  /** Whether the entry is a runtime entry or one written by the automation. Defaults to {@link LogEntryType.Default}. */
  logType?: LogEntryType;
  /** Name of the process the entry belongs to, shown in the Process column. */
  processName?: string;
  /** Version of the process the entry belongs to. */
  processVersion?: string;
  /** Name of the workflow file (or code unit) that produced the entry. */
  fileName?: string;
  /** Key (GUID) of the job the entry belongs to. */
  jobId?: string;
  /** Name of the robot the entry is attributed to. */
  robotName?: string;
  /** Name of the machine the entry is attributed to. */
  machineName?: string;
  /** Identity the entry was produced under, e.g. `DOMAIN\\user`. */
  windowsIdentity?: string;
  /** Session identifier (GUID) of the agent that produced the entry. */
  agentSessionId?: string;
  /**
   * Identifier of the entry (GUID). Defaults to a random UUID. Orchestrator de-duplicates on it:
   * of two entries sharing a fingerprint only one is stored.
   */
  fingerprint?: string;
  /**
   * Any other property is stored on the entry and shown as a custom log field. Nested objects
   * are allowed. Must not use the reserved names `@rawMessage`, `@encryption` or `@compression`,
   * and the whole serialised entry must stay under 512 KB.
   */
  [customField: string]: unknown;
}

/**
 * Options for {@link LogServiceModel.submit}: the folder the entries are stored under and whose
 * `Logs.Create` permission is checked. Provide one of `folderId`, `folderKey` or `folderPath`;
 * when all are omitted the SDK's init-time folder (coded-app meta tag or coded-function context)
 * is used.
 */
export interface LogSubmitOptions extends FolderScopingOnly {}
