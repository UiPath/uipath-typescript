import {
  MemoryGetTimelineOptions,
  MemoryGetTimelineResponse,
  MemoryGetCallsTimelineOptions,
  MemoryGetCallsTimelineResponse,
  MemoryGetTopSpacesOptions,
  MemoryGetTopSpacesResponse,
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
   * Gets agent memory state over time, with optional filters.
   *
   * @param options - Optional time window and scope filters
   * @returns Promise resolving to an array of {@link MemoryGetTimelineResponse}, one per time bucket.
   * @example
   * ```typescript
   * import { Memory } from '@uipath/uipath-typescript/memory';
   *
   * const memory = new Memory(sdk);
   *
   * // Last 24 hours (default window)
   * const timeline = await memory.getTimeline();
   * console.log(timeline[0]?.inMemoryCount);
   * ```
   * @example
   * ```typescript
   * import { ExecutionType } from '@uipath/uipath-typescript/memory';
   *
   * // Scoped to one agent in one folder, runtime executions only
   * const scoped = await memory.getTimeline({
   *   startTime: new Date('2026-05-01T00:00:00Z'),
   *   endTime: new Date('2026-06-01T00:00:00Z'),
   *   agentId: '<agentId>',
   *   folderKeys: ['<folderKey>'],
   *   executionType: ExecutionType.Runtime,
   * });
   * ```
   */
  getTimeline(options?: MemoryGetTimelineOptions): Promise<MemoryGetTimelineResponse[]>;

  /**
   * Gets agent memory-access counts over time, with optional filters.
   *
   * @param options - Optional time window and scope filters
   * @returns Promise resolving to an array of {@link MemoryGetCallsTimelineResponse}, one per time bucket.
   * @example
   * ```typescript
   * import { Memory } from '@uipath/uipath-typescript/memory';
   *
   * const memory = new Memory(sdk);
   *
   * // Last 24 hours (default window)
   * const timeline = await memory.getCallsTimeline();
   * console.log(timeline[0]?.memoryCallsCount);
   * ```
   * @example
   * ```typescript
   * import { ExecutionType } from '@uipath/uipath-typescript/memory';
   *
   * // Scoped to one agent in one folder, runtime executions only
   * const scoped = await memory.getCallsTimeline({
   *   startTime: new Date('2026-05-01T00:00:00Z'),
   *   endTime: new Date('2026-06-01T00:00:00Z'),
   *   agentId: '<agentId>', 
   *   folderKeys: ['<folderKey>'],
   *   executionType: ExecutionType.Runtime,
   * });
   * ```
   */
  getCallsTimeline(options?: MemoryGetCallsTimelineOptions): Promise<MemoryGetCallsTimelineResponse[]>;

  /**
   * Gets the top memory spaces by memory count, with optional filters
   *
   * @param options - Optional limit, time window, and scope filters
   * @returns Promise resolving to an array of {@link MemoryGetTopSpacesResponse}, ranked by memory count.
   * @example
   * ```typescript
   * import { Memory } from '@uipath/uipath-typescript/memory';
   *
   * const memory = new Memory(sdk);
   *
   * // Top 5 memory spaces (default limit and window)
   * const top = await memory.getTopSpaces();
   * console.log(top[0]?.memorySpaceName, top[0]?.memoryCount);
   * ```
   * @example
   * ```typescript
   * import { ExecutionType } from '@uipath/uipath-typescript/memory';
   *
   * // Top 10 spaces for one folder over an explicit window, runtime executions only
   * const topScoped = await memory.getTopSpaces({
   *   startTime: new Date('2026-05-01T00:00:00Z'),
   *   endTime: new Date('2026-06-01T00:00:00Z'),
   *   folderKeys: ['<folderKey>'],
   *   executionType: ExecutionType.Runtime,
   *   limit: 10,
   * });
   * ```
   */
  getTopSpaces(options?: MemoryGetTopSpacesOptions): Promise<MemoryGetTopSpacesResponse[]>;
}
