import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, describeIntegration, InitMode } from '../../config/unified-setup';
import { isValidationError } from '../../../../src/core/errors';
import { generateRandomString } from '../../utils/helpers';
import { Logs, LogEntryLevel, LogEntryType } from '../../../../src/services/orchestrator/logs';
import type { LogEntry } from '../../../../src/services/orchestrator/logs';

const modes: InitMode[] = ['v1'];

/** Process name every submitted entry carries, so the entries can be found in Orchestrator Logs by hand. */
const PROCESS_NAME = 'SdkIntegrationTest';
/** Attribution fields Orchestrator maps to log columns, sent once per run so a rejected one surfaces as a 400. */
const ATTRIBUTION = {
  processVersion: '1.0.0',
  fileName: 'Main',
  robotName: 'sdk-integration-robot',
  machineName: 'sdk-integration-host',
  windowsIdentity: 'SDK\\integration',
} as const;
/** Zero GUID no folder carries; Orchestrator rejects it as nonexistent or inaccessible. */
const NONEXISTENT_FOLDER_KEY = '00000000-0000-0000-0000-000000000000';

// Elasticsearch ingestion lags and arrives out of order on the test tenant, so the suite asserts
// only Orchestrator's response to each batch — never that an entry can be read back.
describeIntegration('Orchestrator Logs - Integration Tests', 'both', modes, () => {
  let logs!: Logs;
  let folderKey!: string;
  let folderId!: number;
  let folderPath!: string;

  beforeAll(() => {
    const service = getServices().logs;
    if (!service) {
      throw new Error('Logs service is not registered for this init mode');
    }
    logs = service;

    const config = getTestConfig();
    if (!config.folderKey) {
      throw new Error('INTEGRATION_TEST_FOLDER_KEY must be configured for submit');
    }
    if (!config.folderId) {
      throw new Error('INTEGRATION_TEST_FOLDER_ID must be configured for submit');
    }
    if (!config.folderPath) {
      throw new Error('INTEGRATION_TEST_FOLDER_PATH must be configured for submit');
    }
    folderKey = config.folderKey;
    folderId = Number(config.folderId);
    folderPath = config.folderPath;
  });

  describe('submit', () => {
    it('should accept a single entry scoped by folderKey', async () => {
      const tag = generateRandomString();

      await expect(
        logs.submit({ message: `${tag} single entry`, processName: PROCESS_NAME }, { folderKey }),
      ).resolves.toBeUndefined();
    });

    it('should accept a batch covering every level plus an entry with every named field and custom fields, scoped by folderId', async () => {
      const tag = generateRandomString();
      const entries: LogEntry[] = Object.values(LogEntryLevel).map((level) => ({
        message: `${tag} level ${level}`,
        level,
        processName: PROCESS_NAME,
      }));
      entries.push({
        message: `${tag} user entry with every named field and custom fields`,
        level: LogEntryLevel.Info,
        timestamp: new Date(),
        logType: LogEntryType.User,
        processName: PROCESS_NAME,
        jobKey: crypto.randomUUID(),
        agentSessionId: crypto.randomUUID(),
        fingerprint: crypto.randomUUID(),
        ...ATTRIBUTION,
        invoiceId: tag,
        activity: { name: 'ReadInvoice', durationMs: 1200 },
      });

      await expect(logs.submit(entries, { folderId })).resolves.toBeUndefined();
    });

    it('should accept an entry scoped by folderPath', async () => {
      const tag = generateRandomString();

      await expect(
        logs.submit({ message: `${tag} folderPath entry`, processName: PROCESS_NAME }, { folderPath }),
      ).resolves.toBeUndefined();
    });

    // Reaches Orchestrator: the zero GUID is a well-formed key that passes the SDK's folder resolution,
    // so this asserts the server's HTTP 400 (surfaced as ValidationError), not client-side validation.
    it('should reject an entry scoped to a nonexistent folder key', async () => {
      const tag = generateRandomString();

      await expect(
        logs.submit({ message: `${tag} nonexistent folder`, processName: PROCESS_NAME }, { folderKey: NONEXISTENT_FOLDER_KEY }),
      ).rejects.toSatisfy(isValidationError);
    });
  });
});
