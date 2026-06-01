/**
 * Mock factories for Agent Memory (Traceview) service tests.
 */

import {
  MemoryTimelinePoint,
  MemoryTimelineResponse,
} from '../../../src/models/agents/memory/memory.types';
import { MEMORY_TEST_CONSTANTS } from '../constants/memory';

/**
 * Creates a single memory timeline point with overridable fields.
 */
export function createMockMemoryTimelinePoint(
  overrides: Partial<MemoryTimelinePoint> = {},
): MemoryTimelinePoint {
  return {
    timeSlice: MEMORY_TEST_CONSTANTS.TIME_SLICE_1,
    inMemoryCount: 3,
    notInMemoryCount: 1,
    totalCount: 4,
    enabledMemoryCount: 2,
    disabledMemoryCount: 2,
    ...overrides,
  };
}

/**
 * Creates a memory timeline response envelope with two points by default.
 */
export function createMockMemoryTimelineResponse(
  points?: MemoryTimelinePoint[],
): MemoryTimelineResponse {
  return {
    data: points ?? [
      createMockMemoryTimelinePoint(),
      createMockMemoryTimelinePoint({
        timeSlice: MEMORY_TEST_CONSTANTS.TIME_SLICE_2,
        inMemoryCount: 5,
        notInMemoryCount: 0,
        totalCount: 5,
        enabledMemoryCount: 5,
        disabledMemoryCount: 0,
      }),
    ],
  };
}
