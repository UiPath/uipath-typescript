import { track } from '../../../core/telemetry';
import { ValidationError } from '../../../core/errors';
import { LogEntryLevel } from '../../../models/orchestrator/logs.types';
import type { LogEntry, LogSubmitOptions } from '../../../models/orchestrator/logs.types';
import type { LogEntryWire } from '../../../models/orchestrator/logs.internal-types';
import type { LogServiceModel } from '../../../models/orchestrator/logs.models';
import { LOG_ENDPOINTS } from '../../../utils/constants/endpoints';
import { resolveFolderHeaders } from '../../../utils/folder/folder-headers';
import { BaseService } from '../../base';

/**
 * Service for writing to UiPath Orchestrator's execution logs.
 *
 * Folder-scoped: entries are stored under, and `Logs.Create` is checked against, the folder
 * resolved from the call's options or the SDK's init-time folder.
 */
export class LogService extends BaseService implements LogServiceModel {
  @track('Logs.Submit')
  async submit(entries: LogEntry | LogEntry[], options?: LogSubmitOptions): Promise<void> {
    const entryList = Array.isArray(entries) ? entries : [entries];

    if (entryList.length === 0) {
      throw new ValidationError({ message: 'Logs.submit: at least one log entry is required.' });
    }
    for (const entry of entryList) {
      if (typeof entry?.message !== 'string' || !entry.message.trim()) {
        throw new ValidationError({ message: 'Logs.submit: every log entry requires a non-empty string `message`.' });
      }
      if (entry.timestamp !== undefined && Number.isNaN(entry.timestamp.getTime())) {
        throw new ValidationError({ message: 'Logs.submit: `timestamp` must be a valid Date.' });
      }
    }

    const headers = resolveFolderHeaders({
      folderId: options?.folderId,
      folderKey: options?.folderKey,
      folderPath: options?.folderPath,
      resourceType: 'Logs.submit',
      fallbackFolderKey: this.config.folderKey,
    });

    // Serialise the batch up front so one call produces one fixed set of fingerprints; Orchestrator
    // de-duplicates on fingerprint, so re-sending an entry with an explicit one is safe.
    const body = entryList.map((entry) => JSON.stringify(toWireEntry(entry)));

    await this.post<void>(LOG_ENDPOINTS.SUBMIT, body, { headers });
  }
}

/**
 * Builds the wire object for one entry: custom fields first, then the named fields on top so a
 * same-named custom key can never override them. `undefined` values vanish in `JSON.stringify`.
 */
function toWireEntry(entry: LogEntry): LogEntryWire {
  const {
    message,
    level,
    timestamp,
    logType,
    processName,
    processVersion,
    fileName,
    jobKey,
    robotName,
    machineName,
    windowsIdentity,
    agentSessionId,
    fingerprint,
    ...customFields
  } = entry;

  return {
    ...customFields,
    message,
    level: level ?? LogEntryLevel.Info,
    timeStamp: (timestamp ?? new Date()).toISOString(),
    fingerprint: fingerprint ?? crypto.randomUUID(),
    logType,
    processName,
    processVersion,
    fileName,
    jobId: jobKey,
    robotName,
    machineName,
    windowsIdentity,
    agentSessionId,
  };
}
