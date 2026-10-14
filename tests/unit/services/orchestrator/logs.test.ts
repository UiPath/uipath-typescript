// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LogService } from '@/services/orchestrator/logs/logs';
import { ApiClient } from '@/core/http/api-client';
import { LOG_ENDPOINTS } from '@/utils/constants/endpoints';
import { FOLDER_ID, FOLDER_KEY, FOLDER_PATH_ENCODED } from '@/utils/constants/headers';
import { ValidationError } from '@/core/errors';
import { LogEntryLevel, LogEntryType } from '@/models/orchestrator/logs.types';
import type { LogEntry, LogSubmitOptions } from '@/models/orchestrator/logs.types';
import { createMockError, TEST_CONSTANTS } from '@tests/utils/mocks';
import { LOG_TEST_CONSTANTS } from '@tests/utils/constants/logs';
import { createServiceTestDependencies, createMockApiClient } from '@tests/utils/setup';

// ===== MOCKING =====
vi.mock('@/core/http/api-client');

// ===== HELPERS =====
/** Parses the posted body (an array of JSON strings) back into wire objects. */
function postedWireEntries(mockApiClient: ReturnType<typeof createMockApiClient>): Record<string, unknown>[] {
  const [, body] = mockApiClient.post.mock.calls[0];
  expect(Array.isArray(body)).toBe(true);
  return (body as string[]).map((serialised) => {
    expect(typeof serialised).toBe('string');
    return JSON.parse(serialised) as Record<string, unknown>;
  });
}

// ===== TEST SUITE =====
describe('LogService Unit Tests', () => {
  let logService: LogService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  const folderOptions: LogSubmitOptions = { folderKey: TEST_CONSTANTS.FOLDER_KEY };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(LOG_TEST_CONSTANTS.NOW));

    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    mockApiClient.post.mockResolvedValue(undefined);

    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient as ApiClient; });

    logService = new LogService(instance);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('submit', () => {
    it('should post an array of serialised entries to the SubmitLogs endpoint', async () => {
      const entries: LogEntry[] = [
        {
          message: LOG_TEST_CONSTANTS.MESSAGE,
          level: LogEntryLevel.Info,
          timestamp: new Date(LOG_TEST_CONSTANTS.TIMESTAMP),
          fingerprint: LOG_TEST_CONSTANTS.FINGERPRINT,
          logType: LogEntryType.User,
          processName: LOG_TEST_CONSTANTS.PROCESS_NAME,
          processVersion: LOG_TEST_CONSTANTS.PROCESS_VERSION,
          fileName: LOG_TEST_CONSTANTS.FILE_NAME,
          jobId: LOG_TEST_CONSTANTS.JOB_ID,
          robotName: LOG_TEST_CONSTANTS.ROBOT_NAME,
          machineName: LOG_TEST_CONSTANTS.MACHINE_NAME,
          windowsIdentity: LOG_TEST_CONSTANTS.WINDOWS_IDENTITY,
          agentSessionId: LOG_TEST_CONSTANTS.AGENT_SESSION_ID,
        },
        {
          message: LOG_TEST_CONSTANTS.SECOND_MESSAGE,
          level: LogEntryLevel.Error,
          timestamp: new Date(LOG_TEST_CONSTANTS.TIMESTAMP),
          fingerprint: LOG_TEST_CONSTANTS.FINGERPRINT,
        },
      ];

      await logService.submit(entries, folderOptions);

      expect(mockApiClient.post).toHaveBeenCalledTimes(1);
      const [endpoint] = mockApiClient.post.mock.calls[0];
      expect(endpoint).toBe(LOG_ENDPOINTS.SUBMIT);
      expect(postedWireEntries(mockApiClient)).toEqual([
        {
          message: LOG_TEST_CONSTANTS.MESSAGE,
          level: 'Info',
          timeStamp: LOG_TEST_CONSTANTS.TIMESTAMP,
          fingerprint: LOG_TEST_CONSTANTS.FINGERPRINT,
          logType: 'User',
          processName: LOG_TEST_CONSTANTS.PROCESS_NAME,
          processVersion: LOG_TEST_CONSTANTS.PROCESS_VERSION,
          fileName: LOG_TEST_CONSTANTS.FILE_NAME,
          jobId: LOG_TEST_CONSTANTS.JOB_ID,
          robotName: LOG_TEST_CONSTANTS.ROBOT_NAME,
          machineName: LOG_TEST_CONSTANTS.MACHINE_NAME,
          windowsIdentity: LOG_TEST_CONSTANTS.WINDOWS_IDENTITY,
          agentSessionId: LOG_TEST_CONSTANTS.AGENT_SESSION_ID,
        },
        {
          message: LOG_TEST_CONSTANTS.SECOND_MESSAGE,
          level: 'Error',
          timeStamp: LOG_TEST_CONSTANTS.TIMESTAMP,
          fingerprint: LOG_TEST_CONSTANTS.FINGERPRINT,
        },
      ]);
    });

    it('should normalise a single entry to a one-element array', async () => {
      await logService.submit({ message: LOG_TEST_CONSTANTS.MESSAGE }, folderOptions);

      const wire = postedWireEntries(mockApiClient);
      expect(wire).toHaveLength(1);
      expect(wire[0].message).toBe(LOG_TEST_CONSTANTS.MESSAGE);
    });

    it('should default level to Info, timeStamp to now and fingerprint to a UUID', async () => {
      await logService.submit({ message: LOG_TEST_CONSTANTS.MESSAGE }, folderOptions);

      const [wire] = postedWireEntries(mockApiClient);
      expect(wire.level).toBe(LogEntryLevel.Info);
      expect(wire.timeStamp).toBe(LOG_TEST_CONSTANTS.NOW);
      expect(wire.fingerprint).toMatch(LOG_TEST_CONSTANTS.UUID_REGEX);
    });

    it('should preserve a caller-provided level, timestamp and fingerprint', async () => {
      await logService.submit({
        message: LOG_TEST_CONSTANTS.MESSAGE,
        level: LogEntryLevel.Warn,
        timestamp: new Date(LOG_TEST_CONSTANTS.TIMESTAMP),
        fingerprint: LOG_TEST_CONSTANTS.FINGERPRINT,
      }, folderOptions);

      const [wire] = postedWireEntries(mockApiClient);
      expect(wire.level).toBe('Warn');
      expect(wire.timeStamp).toBe(LOG_TEST_CONSTANTS.TIMESTAMP);
      expect(wire.fingerprint).toBe(LOG_TEST_CONSTANTS.FINGERPRINT);
    });

    it('should pass custom fields, including nested objects, through verbatim', async () => {
      await logService.submit({
        message: LOG_TEST_CONSTANTS.MESSAGE,
        [LOG_TEST_CONSTANTS.CUSTOM_FIELD_KEY]: LOG_TEST_CONSTANTS.CUSTOM_FIELD_VALUE,
        [LOG_TEST_CONSTANTS.NESTED_FIELD_KEY]: LOG_TEST_CONSTANTS.NESTED_FIELD_VALUE,
      }, folderOptions);

      const [wire] = postedWireEntries(mockApiClient);
      expect(wire[LOG_TEST_CONSTANTS.CUSTOM_FIELD_KEY]).toBe(LOG_TEST_CONSTANTS.CUSTOM_FIELD_VALUE);
      expect(wire[LOG_TEST_CONSTANTS.NESTED_FIELD_KEY]).toEqual(LOG_TEST_CONSTANTS.NESTED_FIELD_VALUE);
    });

    it('should let named wire fields win over a same-named custom key', async () => {
      // `timeStamp` is the wire name of `timestamp`; a custom key spelled that way must not
      // replace the value the SDK derives from `timestamp`.
      await logService.submit({
        message: LOG_TEST_CONSTANTS.MESSAGE,
        timestamp: new Date(LOG_TEST_CONSTANTS.TIMESTAMP),
        timeStamp: LOG_TEST_CONSTANTS.BOGUS_TIME_STAMP,
      }, folderOptions);

      const [wire] = postedWireEntries(mockApiClient);
      expect(wire.timeStamp).toBe(LOG_TEST_CONSTANTS.TIMESTAMP);
      expect(wire.message).toBe(LOG_TEST_CONSTANTS.MESSAGE);
    });

    it('should omit optional fields that are undefined from the wire JSON', async () => {
      await logService.submit({
        message: LOG_TEST_CONSTANTS.MESSAGE,
        processName: undefined,
        jobId: undefined,
      }, folderOptions);

      const [wire] = postedWireEntries(mockApiClient);
      expect(Object.keys(wire).sort()).toEqual(['fingerprint', 'level', 'message', 'timeStamp']);
    });

    it('should not mutate the caller-supplied entry objects', async () => {
      const entry: LogEntry = { message: LOG_TEST_CONSTANTS.MESSAGE };
      const snapshot: LogEntry = { ...entry };

      await logService.submit(entry, folderOptions);

      expect(entry).toEqual(snapshot);
    });

    it('should send folderKey as the X-UIPATH-FolderKey header', async () => {
      await logService.submit({ message: LOG_TEST_CONSTANTS.MESSAGE }, { folderKey: TEST_CONSTANTS.FOLDER_KEY });

      const [, , requestSpec] = mockApiClient.post.mock.calls[0];
      expect(requestSpec.headers).toEqual({ [FOLDER_KEY]: TEST_CONSTANTS.FOLDER_KEY });
    });

    it('should send folderId as the X-UIPATH-OrganizationUnitId header', async () => {
      await logService.submit({ message: LOG_TEST_CONSTANTS.MESSAGE }, { folderId: TEST_CONSTANTS.FOLDER_ID });

      const [, , requestSpec] = mockApiClient.post.mock.calls[0];
      expect(requestSpec.headers).toEqual({ [FOLDER_ID]: String(TEST_CONSTANTS.FOLDER_ID) });
    });

    it('should send folderPath as the encoded X-UIPATH-FolderPath-Encoded header', async () => {
      await logService.submit({ message: LOG_TEST_CONSTANTS.MESSAGE }, { folderPath: LOG_TEST_CONSTANTS.FOLDER_PATH });

      const [, , requestSpec] = mockApiClient.post.mock.calls[0];
      expect(requestSpec.headers).toEqual({ [FOLDER_PATH_ENCODED]: LOG_TEST_CONSTANTS.FOLDER_PATH_ENCODED });
    });

    it('should fall back to SDK init-time folderKey when no folder is provided', async () => {
      // Simulates the coded-app meta-tag (`uipath:folder-key`) path.
      const { instance } = createServiceTestDependencies({ folderKey: TEST_CONSTANTS.FOLDER_KEY });
      vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient as ApiClient; });
      const scopedService = new LogService(instance);

      await scopedService.submit({ message: LOG_TEST_CONSTANTS.MESSAGE });

      const [, , requestSpec] = mockApiClient.post.mock.calls[0];
      expect(requestSpec.headers).toEqual({ [FOLDER_KEY]: TEST_CONSTANTS.FOLDER_KEY });
    });

    it('should suppress the init-time folderKey fallback when the caller provides an explicit folder', async () => {
      const { instance } = createServiceTestDependencies({ folderKey: TEST_CONSTANTS.FOLDER_KEY });
      vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient as ApiClient; });
      const scopedService = new LogService(instance);

      await scopedService.submit({ message: LOG_TEST_CONSTANTS.MESSAGE }, { folderId: TEST_CONSTANTS.FOLDER_ID });

      const [, , requestSpec] = mockApiClient.post.mock.calls[0];
      expect(requestSpec.headers).toEqual({ [FOLDER_ID]: String(TEST_CONSTANTS.FOLDER_ID) });
      expect(requestSpec.headers[FOLDER_KEY]).toBeUndefined();
    });

    it('should throw ValidationError for an empty entries array', async () => {
      await expect(logService.submit([], folderOptions)).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when an entry has no message', async () => {
      const entryWithoutMessage: Partial<LogEntry> = { level: LogEntryLevel.Info };

      await expect(
        logService.submit([{ message: LOG_TEST_CONSTANTS.MESSAGE }, entryWithoutMessage as LogEntry], folderOptions),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when an entry has an empty-string message', async () => {
      await expect(logService.submit({ message: '' }, folderOptions)).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when no folder context is resolvable', async () => {
      // No folder option AND no init-time folderKey on config — must reject.
      await expect(logService.submit({ message: LOG_TEST_CONSTANTS.MESSAGE })).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        logService.submit({ message: LOG_TEST_CONSTANTS.MESSAGE }, folderOptions),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

    it('should resolve to undefined on success', async () => {
      await expect(
        logService.submit({ message: LOG_TEST_CONSTANTS.MESSAGE }, folderOptions),
      ).resolves.toBeUndefined();
    });
  });
});
