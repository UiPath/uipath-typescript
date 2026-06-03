import {
  MemoryGetTimelineOptions,
  MemoryGetTimelineResponse,
  MemoryGetCallsTimelineOptions,
  MemoryGetCallsTimelineResponse,
  MemoryGetTopSpacesOptions,
  MemoryGetTopSpacesResponse,
} from './memory.types';

/**
 * Service for querying UiPath Agent Memory analytics.
 *
 * Agent Memory is a shared store of human-in-the-loop interactions that
 * improves agent runtime reliability. These read-only analytics power the
 * Agents app's "Memory spaces" dashboards.
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
   * @param options - Optional time window and scope filters {@link MemoryGetTimelineOptions}
   * @returns Promise resolving to {@link MemoryGetTimelineResponse} — a `data` array of {@link MemoryTimelinePoint}, one per time bucket. The array may be absent when no data matches.
   * @example
   * ```typescript
   * import { Memory } from '@uipath/uipath-typescript/memory';
   *
   * const memory = new Memory(sdk);
   *
   * // Last 24 hours (default window)
   * const timeline = await memory.getTimeline();
   * console.log(timeline.data?.[0]?.inMemoryCount);
   * ```
   * @example
   * ```typescript
   * import { Memory, ExecutionType } from '@uipath/uipath-typescript/memory';
   *
   * const memory = new Memory(sdk);
   *
   * // Scoped to one agent in one folder, runtime executions only
   * const timeline = await memory.getTimeline({
   *   startTime: '2026-05-01T00:00:00Z',
   *   endTime: '2026-06-01T00:00:00Z',
   *   agentId: '<agentId>',
   *   folderKeys: ['<folderKey>'],
   *   executionType: ExecutionType.Runtime,
   * });
   * ```
   */
  getTimeline(options?: MemoryGetTimelineOptions): Promise<MemoryGetTimelineResponse>;

  /**
   * Retrieves a time-series of memory-call counts bucketed across the requested
   * window.
   *
   * @param options - Optional time window and scope filters {@link MemoryGetCallsTimelineOptions}
   * @returns Promise resolving to {@link MemoryGetCallsTimelineResponse} — a `data` array of {@link MemoryCallsTimelinePoint}, one per time bucket. The array may be absent when no data matches.
   * @example
   * ```typescript
   * import { Memory } from '@uipath/uipath-typescript/memory';
   *
   * const memory = new Memory(sdk);
   *
   * // Last 24 hours (default window)
   * const timeline = await memory.getCallsTimeline();
   * console.log(timeline.data?.[0]?.memoryCallsCount);
   * ```
   * @example
   * ```typescript
   * import { Memory, ExecutionType } from '@uipath/uipath-typescript/memory';
   *
   * const memory = new Memory(sdk);
   *
   * // Scoped to one agent in one folder, runtime executions only
   * const timeline = await memory.getCallsTimeline({
   *   startTime: '2026-05-01T00:00:00Z',
   *   endTime: '2026-06-01T00:00:00Z',
   *   agentId: '<agentId>',
   *   folderKeys: ['<folderKey>'],
   *   executionType: ExecutionType.Runtime,
   * });
   * ```
   */
  getCallsTimeline(options?: MemoryGetCallsTimelineOptions): Promise<MemoryGetCallsTimelineResponse>;

  /**
   * Retrieves the top memory spaces ranked by memory count over the requested
   * window.
   *
   * @param options - Optional limit, time window, and scope filters {@link MemoryGetTopSpacesOptions}
   * @returns Promise resolving to {@link MemoryGetTopSpacesResponse} — a `data` array of {@link MemorySpace}, ranked by memory count. The array may be absent when no data matches.
   * @example
   * ```typescript
   * import { Memory } from '@uipath/uipath-typescript/memory';
   *
   * const memory = new Memory(sdk);
   *
   * // Top 5 memory spaces (default limit and window)
   * const top = await memory.getTopSpaces();
   * console.log(top.data?.[0]?.memorySpaceName, top.data?.[0]?.memoryCount);
   * ```
   * @example
   * ```typescript
   * import { Memory, ExecutionType } from '@uipath/uipath-typescript/memory';
   *
   * const memory = new Memory(sdk);
   *
   * // Top 10 spaces for one folder over an explicit window, runtime executions only
   * const top = await memory.getTopSpaces({
   *   startTime: '2026-05-01T00:00:00Z',
   *   endTime: '2026-06-01T00:00:00Z',
   *   folderKeys: ['<folderKey>'],
   *   executionType: ExecutionType.Runtime,
   *   limit: 10,
   * });
   * ```
   */
  getTopSpaces(options?: MemoryGetTopSpacesOptions): Promise<MemoryGetTopSpacesResponse>;
}
