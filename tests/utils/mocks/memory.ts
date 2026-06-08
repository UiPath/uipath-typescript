/**
 * Mock factories for Agent Memory service tests.
 */

import {
  MemoryTimelinePoint,
  MemoryCallsTimelinePoint,
  MemorySpace,
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
 * Creates a raw memory timeline API body (`{ data }` envelope) with two points by default.
 */
export function createMockMemoryGetTimelineResponse(
  points?: MemoryTimelinePoint[],
): { data: MemoryTimelinePoint[] } {
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

/**
 * Creates a single memory-calls timeline point with overridable fields.
 */
export function createMockMemoryCallsTimelinePoint(
  overrides: Partial<MemoryCallsTimelinePoint> = {},
): MemoryCallsTimelinePoint {
  return {
    timeSlice: MEMORY_TEST_CONSTANTS.TIME_SLICE_1,
    memoryCallsCount: 7,
    ...overrides,
  };
}

/**
 * Creates a raw memory-calls timeline API body (`{ data }` envelope) with two points by default.
 */
export function createMockMemoryGetCallsTimelineResponse(
  points?: MemoryCallsTimelinePoint[],
): { data: MemoryCallsTimelinePoint[] } {
  return {
    data: points ?? [
      createMockMemoryCallsTimelinePoint(),
      createMockMemoryCallsTimelinePoint({
        timeSlice: MEMORY_TEST_CONSTANTS.TIME_SLICE_2,
        memoryCallsCount: 12,
      }),
    ],
  };
}

/**
 * Creates a single memory space with overridable fields.
 */
export function createMockMemorySpace(
  overrides: Partial<MemorySpace> = {},
): MemorySpace {
  return {
    memorySpaceId: MEMORY_TEST_CONSTANTS.MEMORY_SPACE_ID,
    memorySpaceName: MEMORY_TEST_CONSTANTS.MEMORY_SPACE_NAME,
    memoryCount: 9,
    enabledMemoryCount: 6,
    disabledMemoryCount: 3,
    ...overrides,
  };
}

/**
 * Creates a raw top-memory-spaces API body (`{ data }` envelope) with two spaces by default.
 */
export function createMockMemoryGetTopSpacesResponse(
  spaces?: MemorySpace[],
): { data: MemorySpace[] } {
  return {
    data: spaces ?? [
      createMockMemorySpace(),
      createMockMemorySpace({
        memorySpaceId: MEMORY_TEST_CONSTANTS.MEMORY_SPACE_ID_2,
        memorySpaceName: MEMORY_TEST_CONSTANTS.MEMORY_SPACE_NAME_2,
        memoryCount: 4,
        enabledMemoryCount: 4,
        disabledMemoryCount: 0,
      }),
    ],
  };
}
