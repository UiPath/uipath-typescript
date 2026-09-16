import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, describeIntegration, InitMode } from '../../config/unified-setup';
import { AgentMemory } from '../../../../src/services/agents/memory';
import { AgentMemoryExecutionType } from '../../../../src/models/agents/memory/memory.types';
import { MEMORY_TEST_CONSTANTS } from '../../../utils/constants';
import { recentWindow } from '../../utils/helpers';

const modes: InitMode[] = ['v1'];

const WINDOW = recentWindow();

// The filter tests exercise the filter body-building path against the live API.
// An unmatched AGENT_ID simply narrows the result to empty/zero buckets (still
// HTTP 200), but `folderKeys` is authorized before it is applied — a folder the
// caller cannot access returns 403 — so the folder filter uses the configured
// INTEGRATION_TEST_FOLDER_KEY rather than an arbitrary GUID.

// insightsrtm_ rejects PAT tokens entirely (401 regardless of scopes), so this
// suite authenticates with a user token and skips when one is not configured.
describeIntegration('Agent Memory - Integration Tests', 'user', modes, () => {
  let memory!: AgentMemory;
  let folderKey!: string;

  beforeAll(() => {
    const service = getServices().memory;
    if (!service) {
      throw new Error('Memory service is not registered for this init mode');
    }
    memory = service;

    const configuredFolderKey = getTestConfig().folderKey;
    if (!configuredFolderKey) {
      throw new Error(
        'INTEGRATION_TEST_FOLDER_KEY is not configured. The folder filter tests need a ' +
        'folder the caller can access — an inaccessible folder key returns 403.',
      );
    }
    folderKey = configuredFolderKey;
  });

  describe('getTimeline', () => {
    it('should retrieve the memory timeline for the default window', async () => {
      const result = await memory.getTimeline();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should retrieve the memory timeline for an explicit window', async () => {
      const result = await memory.getTimeline(WINDOW);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should accept agent, folder, and execution-type filters', async () => {
      const result = await memory.getTimeline({
        ...WINDOW,
        agentId: MEMORY_TEST_CONSTANTS.AGENT_ID,
        folderKeys: [folderKey],
        executionType: AgentMemoryExecutionType.Runtime,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return points with the expected numeric shape', async () => {
      const result = await memory.getTimeline(WINDOW);

      if (result.length === 0) {
        throw new Error('No memory timeline points returned for the requested window');
      }

      const point = result[0];
      expect(typeof point.timeSlice).toBe('string');
      expect(typeof point.inMemoryCount).toBe('number');
      expect(typeof point.notInMemoryCount).toBe('number');
      expect(typeof point.totalCount).toBe('number');
      expect(typeof point.enabledMemoryCount).toBe('number');
      expect(typeof point.disabledMemoryCount).toBe('number');
    });
  });

  describe('getCallsTimeline', () => {
    it('should retrieve the memory calls timeline for the default window', async () => {
      const result = await memory.getCallsTimeline();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should retrieve the memory calls timeline for an explicit window', async () => {
      const result = await memory.getCallsTimeline(WINDOW);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should accept agent, folder, and execution-type filters', async () => {
      const result = await memory.getCallsTimeline({
        ...WINDOW,
        agentId: MEMORY_TEST_CONSTANTS.AGENT_ID,
        folderKeys: [folderKey],
        executionType: AgentMemoryExecutionType.Runtime,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return points with the expected numeric shape', async () => {
      const result = await memory.getCallsTimeline(WINDOW);

      if (result.length === 0) {
        throw new Error('No memory calls timeline points returned for the requested window');
      }

      const point = result[0];
      expect(typeof point.timeSlice).toBe('string');
      expect(typeof point.memoryCallsCount).toBe('number');
    });
  });

  describe('getTopSpaces', () => {
    it('should retrieve the top memory spaces for the default window', async () => {
      const result = await memory.getTopSpaces();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should respect the limit option', async () => {
      const result = await memory.getTopSpaces({ ...WINDOW, limit: 3 });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should accept agent, folder, and execution-type filters', async () => {
      const result = await memory.getTopSpaces({
        ...WINDOW,
        agentId: MEMORY_TEST_CONSTANTS.AGENT_ID,
        folderKeys: [folderKey],
        executionType: AgentMemoryExecutionType.Runtime,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    // skip: needs a memory-enabled agent run in the test tenant — no spaces to read without it.
    it.skip('should return spaces with the expected shape', async () => {
      const result = await memory.getTopSpaces(WINDOW);

      if (result.length === 0) {
        throw new Error('No memory spaces returned for the requested window');
      }

      const space = result[0];
      expect(typeof space.memorySpaceId).toBe('string');
      expect(typeof space.memorySpaceName).toBe('string');
      expect(typeof space.memoryCount).toBe('number');
      expect(typeof space.enabledMemoryCount).toBe('number');
      expect(typeof space.disabledMemoryCount).toBe('number');
    });
  });
});
