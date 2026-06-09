import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Memory } from '../../../../src/services/agents/memory';
import { ExecutionType } from '../../../../src/models/agents/memory/memory.types';
import { MEMORY_TEST_CONSTANTS } from '../../../utils/constants';

const modes: InitMode[] = ['v1'];

const WINDOW = {
  startTime: new Date(MEMORY_TEST_CONSTANTS.START_TIME),
  endTime: new Date(MEMORY_TEST_CONSTANTS.END_TIME),
};

// The filter tests pass arbitrary well-formed identifiers (AGENT_ID / FOLDER_KEY)
// only to exercise the filter body-building path against the live API. Filters
// narrow results, so unmatched values simply yield empty/zero buckets (still HTTP 200).

// skip: insightsrtm_ endpoints do not support PAT auth — they reject PAT tokens
// with 401 regardless of scopes and require OAuth. Test bodies are kept intact
// so they run once the integration harness supports OAuth for this service.
describe.skip.each(modes)('Agent Memory - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let memory!: Memory;

  beforeAll(() => {
    const service = getServices().memory;
    if (!service) {
      throw new Error('Memory service is not registered for this init mode');
    }
    memory = service;
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
        folderKeys: [MEMORY_TEST_CONSTANTS.FOLDER_KEY],
        executionType: ExecutionType.Runtime,
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
        folderKeys: [MEMORY_TEST_CONSTANTS.FOLDER_KEY],
        executionType: ExecutionType.Runtime,
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
        folderKeys: [MEMORY_TEST_CONSTANTS.FOLDER_KEY],
        executionType: ExecutionType.Runtime,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return spaces with the expected shape', async () => {
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
