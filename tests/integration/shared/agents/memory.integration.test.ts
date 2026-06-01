import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Memory } from '../../../../src/services/agents/memory';
import { ExecutionType } from '../../../../src/models/agents/memory/memory.types';

const modes: InitMode[] = ['v1'];

const WINDOW = {
  startTime: '2026-05-01T00:00:00Z',
  endTime: '2026-06-01T00:00:00Z',
};

// Arbitrary well-formed identifiers used only to exercise the filter
// body-building path against the live API. Filters narrow results, so
// unmatched values simply yield empty/zero buckets (still HTTP 200).
const FILTER_AGENT_ID = '6f0f123e-88db-4f2a-a632-5f315f631534';
const FILTER_FOLDER_KEY = '8709b9b7-5779-4952-b519-016db272da0a';

describe.each(modes)('Agent Memory - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let memory!: Memory;

  beforeAll(() => {
    const service = getServices().memory;
    if (!service) {
      throw new Error('Memory service is not registered for this init mode');
    }
    memory = service;
  });

  describe('getMemoryTimeline', () => {
    it('should retrieve the memory timeline for the default window', async () => {
      const result = await memory.getMemoryTimeline();

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should retrieve the memory timeline for an explicit window', async () => {
      const result = await memory.getMemoryTimeline(WINDOW);

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should accept agent, folder, and execution-type filters', async () => {
      const result = await memory.getMemoryTimeline({
        ...WINDOW,
        agentId: FILTER_AGENT_ID,
        folderKeys: [FILTER_FOLDER_KEY],
        executionType: ExecutionType.Runtime,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should return points with the expected numeric shape', async () => {
      const result = await memory.getMemoryTimeline(WINDOW);

      if (!result.data || result.data.length === 0) {
        throw new Error('No memory timeline points returned for the requested window');
      }

      const point = result.data[0];
      expect(typeof point.timeSlice).toBe('string');
      expect(typeof point.inMemoryCount).toBe('number');
      expect(typeof point.notInMemoryCount).toBe('number');
      expect(typeof point.totalCount).toBe('number');
      expect(typeof point.enabledMemoryCount).toBe('number');
      expect(typeof point.disabledMemoryCount).toBe('number');
    });
  });
});
