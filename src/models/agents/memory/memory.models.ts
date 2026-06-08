import {
  MemoryGetTimelineOptions,
  MemoryTimelinePoint,
  MemoryGetCallsTimelineOptions,
  MemoryCallsTimelinePoint,
  MemoryGetTopSpacesOptions,
  MemorySpace,
} from './memory.types';

/**
 * Service for managing UiPath Agent Memory.
 *
 * Agent Memory is a shared store of human-in-the-loop interactions that
 * improves agent runtime reliability.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Memory } from '@uipath/uipath-typescript/memory';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const memory = new Memory(sdk);
 * const timeline = await memory.getTimeline();
 * ```
 */
export interface MemoryServiceModel {
  /**
   * Retrieves a time-series of agent-memory state counts bucketed across the
   * requested window.
   *
   * @param options - Optional time window and scope filters
   * @returns Promise resolving to an array of {@link MemoryTimelinePoint}, one per time bucket. Empty when no data matches.
   * @example
   * ```typescript
   * import { Memory, ExecutionType } from '@uipath/uipath-typescript/memory';
   *
   * const memory = new Memory(sdk);
   *
   * // Last 24 hours (default window)
   * const timeline = await memory.getTimeline();
   * console.log(timeline[0]?.inMemoryCount);
   *
   * // Scoped to one agent in one folder, runtime executions only
   * const scoped = await memory.getTimeline({
   *   startTime: '2026-05-01T00:00:00Z',
   *   endTime: '2026-06-01T00:00:00Z',
   *   agentId: '<agentId>',
   *   folderKeys: ['<folderKey>'],
   *   executionType: ExecutionType.Runtime,
   * });
   * ```
   */
  getTimeline(options?: MemoryGetTimelineOptions): Promise<MemoryTimelinePoint[]>;

  /**
   * Retrieves a time-series of memory-call counts bucketed across the requested
   * window.
   *
   * @param options - Optional time window and scope filters
   * @returns Promise resolving to an array of {@link MemoryCallsTimelinePoint}, one per time bucket. Empty when no data matches.
   * @example
   * ```typescript
   * import { Memory, ExecutionType } from '@uipath/uipath-typescript/memory';
   *
   * const memory = new Memory(sdk);
   *
   * // Last 24 hours (default window)
   * const timeline = await memory.getCallsTimeline();
   * console.log(timeline[0]?.memoryCallsCount);
   *
   * // Scoped to one agent in one folder, runtime executions only
   * const scoped = await memory.getCallsTimeline({
   *   startTime: '2026-05-01T00:00:00Z',
   *   endTime: '2026-06-01T00:00:00Z',
   *   agentId: '<agentId>',
   *   folderKeys: ['<folderKey>'],
   *   executionType: ExecutionType.Runtime,
   * });
   * ```
   */
  getCallsTimeline(options?: MemoryGetCallsTimelineOptions): Promise<MemoryCallsTimelinePoint[]>;

  /**
   * Retrieves the top memory spaces ranked by memory count over the requested
   * window.
   *
   * @param options - Optional limit, time window, and scope filters
   * @returns Promise resolving to an array of {@link MemorySpace}, ranked by memory count. Empty when no data matches.
   * @example
   * ```typescript
   * import { Memory, ExecutionType } from '@uipath/uipath-typescript/memory';
   *
   * const memory = new Memory(sdk);
   *
   * // Top 5 memory spaces (default limit and window)
   * const top = await memory.getTopSpaces();
   * console.log(top[0]?.memorySpaceName, top[0]?.memoryCount);
   *
   * // Top 10 spaces for one folder over an explicit window, runtime executions only
   * const topScoped = await memory.getTopSpaces({
   *   startTime: '2026-05-01T00:00:00Z',
   *   endTime: '2026-06-01T00:00:00Z',
   *   folderKeys: ['<folderKey>'],
   *   executionType: ExecutionType.Runtime,
   *   limit: 10,
   * });
   * ```
   */
  getTopSpaces(options?: MemoryGetTopSpacesOptions): Promise<MemorySpace[]>;
}
