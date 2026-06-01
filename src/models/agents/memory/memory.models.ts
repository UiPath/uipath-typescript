import {
  MemoryTimelineGetOptions,
  MemoryTimelineResponse,
  MemoryCallsTimelineGetOptions,
  MemoryCallsTimelineResponse,
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
 * const timeline = await memory.getMemoryTimeline();
 * ```
 */
export interface MemoryServiceModel {
  /**
   * Retrieves a time-series of agent-memory state counts bucketed across the
   * requested window.
   *
   * Each point reports how many memory entries were in-memory vs not-in-memory
   * and enabled vs disabled for that time bucket. Bucket size is chosen
   * server-side based on the window length. When no time window is provided,
   * the server defaults to the last 24 hours (with the upper bound defaulting
   * to now). Optionally filter by agent, agent version, folder, or execution
   * type.
   *
   * @param options - Optional time window and scope filters {@link MemoryTimelineGetOptions}
   * @returns Promise resolving to {@link MemoryTimelineResponse} — a `data` array of {@link MemoryTimelinePoint}, one per time bucket. The array may be absent when no data matches.
   * @example
   * ```typescript
   * import { Memory } from '@uipath/uipath-typescript/memory';
   *
   * const memory = new Memory(sdk);
   *
   * // Last 24 hours (server-default window)
   * const timeline = await memory.getMemoryTimeline();
   * console.log(timeline.data?.[0]?.inMemoryCount);
   * ```
   * @example
   * ```typescript
   * import { Memory, ExecutionType } from '@uipath/uipath-typescript/memory';
   *
   * const memory = new Memory(sdk);
   *
   * // Scoped to one agent in one folder, runtime executions only
   * const timeline = await memory.getMemoryTimeline({
   *   startTime: '2026-05-01T00:00:00Z',
   *   endTime: '2026-06-01T00:00:00Z',
   *   agentId: '<agentId>',
   *   folderKeys: ['<folderKey>'],
   *   executionType: ExecutionType.Runtime,
   * });
   * ```
   */
  getMemoryTimeline(options?: MemoryTimelineGetOptions): Promise<MemoryTimelineResponse>;

  /**
   * Retrieves a time-series of memory-call counts bucketed across the requested
   * window.
   *
   * Each point reports how many memory calls occurred in that time bucket.
   * Bucket size is chosen server-side based on the window length. When no time
   * window is provided, the server defaults to the last 24 hours (with the
   * upper bound defaulting to now). Optionally filter by agent, agent version,
   * folder, or execution type.
   *
   * @param options - Optional time window and scope filters {@link MemoryCallsTimelineGetOptions}
   * @returns Promise resolving to {@link MemoryCallsTimelineResponse} — a `data` array of {@link MemoryCallsTimelinePoint}, one per time bucket. The array may be absent when no data matches.
   * @example
   * ```typescript
   * import { Memory } from '@uipath/uipath-typescript/memory';
   *
   * const memory = new Memory(sdk);
   *
   * // Last 24 hours (server-default window)
   * const timeline = await memory.getMemoryCallsTimeline();
   * console.log(timeline.data?.[0]?.memoryCallsCount);
   * ```
   * @example
   * ```typescript
   * import { Memory, ExecutionType } from '@uipath/uipath-typescript/memory';
   *
   * const memory = new Memory(sdk);
   *
   * // Scoped to one agent in one folder, runtime executions only
   * const timeline = await memory.getMemoryCallsTimeline({
   *   startTime: '2026-05-01T00:00:00Z',
   *   endTime: '2026-06-01T00:00:00Z',
   *   agentId: '<agentId>',
   *   folderKeys: ['<folderKey>'],
   *   executionType: ExecutionType.Runtime,
   * });
   * ```
   */
  getMemoryCallsTimeline(options?: MemoryCallsTimelineGetOptions): Promise<MemoryCallsTimelineResponse>;
}
