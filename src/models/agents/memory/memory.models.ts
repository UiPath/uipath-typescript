import {
  AgentMemoryGetTimelineOptions,
  AgentMemoryGetTimelineResponse,
  AgentMemoryGetCallsTimelineOptions,
  AgentMemoryGetCallsTimelineResponse,
  AgentMemoryGetTopSpacesOptions,
  AgentMemoryGetTopSpacesResponse,
} from './memory.types';

/**
 *
 * @experimental
 *
 * /// warning
 * Preview: This service is experimental and may change or be removed in future releases.
 * ///
 *
 * Service for managing UiPath Agent Memory.
 *
 * Agent Memory is a persistent store of information an agent
 * retains across runs to improve runtime reliability.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { AgentMemory } from '@uipath/uipath-typescript/agent-memory';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const memory = new AgentMemory(sdk);
 * const timeline = await memory.getTimeline();
 * ```
 */
export interface AgentMemoryServiceModel {
  /**
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Gets agent memory state over time, with optional filters.
   *
   * @param options - Optional time window and scope filters
   * @returns Promise resolving to an array of {@link AgentMemoryGetTimelineResponse}, one per time bucket.
   * @example
   * ```typescript
   * import { AgentMemory } from '@uipath/uipath-typescript/agent-memory';
   *
   * const memory = new AgentMemory(sdk);
   *
   * // Last 24 hours (default window)
   * const timeline = await memory.getTimeline();
   * console.log(timeline[0]?.inMemoryCount);
   * ```
   * @example
   * ```typescript
   * import { AgentMemoryExecutionType } from '@uipath/uipath-typescript/agent-memory';
   *
   * // Scoped to one agent in one folder, runtime executions only
   * const scoped = await memory.getTimeline({
   *   startTime: new Date('2026-05-01T00:00:00Z'),
   *   endTime: new Date('2026-06-01T00:00:00Z'),
   *   agentId: '<agentId>',
   *   folderKeys: ['<folderKey>'],
   *   executionType: AgentMemoryExecutionType.Runtime,
   * });
   * ```
   */
  getTimeline(options?: AgentMemoryGetTimelineOptions): Promise<AgentMemoryGetTimelineResponse[]>;

  /**
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Gets the number of agent memory calls (accesses to the memory store) over time, with optional filters.
   *
   * @param options - Optional time window and scope filters
   * @returns Promise resolving to an array of {@link AgentMemoryGetCallsTimelineResponse}, one per time bucket.
   * @example
   * ```typescript
   * import { AgentMemory } from '@uipath/uipath-typescript/agent-memory';
   *
   * const memory = new AgentMemory(sdk);
   *
   * // Last 24 hours (default window)
   * const timeline = await memory.getCallsTimeline();
   * console.log(timeline[0]?.memoryCallsCount);
   * ```
   * @example
   * ```typescript
   * import { AgentMemoryExecutionType } from '@uipath/uipath-typescript/agent-memory';
   *
   * // Scoped to one agent in one folder, runtime executions only
   * const scoped = await memory.getCallsTimeline({
   *   startTime: new Date('2026-05-01T00:00:00Z'),
   *   endTime: new Date('2026-06-01T00:00:00Z'),
   *   agentId: '<agentId>', 
   *   folderKeys: ['<folderKey>'],
   *   executionType: AgentMemoryExecutionType.Runtime,
   * });
   * ```
   */
  getCallsTimeline(options?: AgentMemoryGetCallsTimelineOptions): Promise<AgentMemoryGetCallsTimelineResponse[]>;

  /**
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Gets the top memory spaces by memory count, with optional filters
   *
   * @param options - Optional limit, time window, and scope filters
   * @returns Promise resolving to an array of {@link AgentMemoryGetTopSpacesResponse}, ranked by memory count.
   * @example
   * ```typescript
   * import { AgentMemory } from '@uipath/uipath-typescript/agent-memory';
   *
   * const memory = new AgentMemory(sdk);
   *
   * // Top 5 memory spaces (default limit and window)
   * const top = await memory.getTopSpaces();
   * console.log(top[0]?.memorySpaceName, top[0]?.memoryCount);
   * ```
   * @example
   * ```typescript
   * import { AgentMemoryExecutionType } from '@uipath/uipath-typescript/agent-memory';
   *
   * // Top 10 spaces for one folder over an explicit window, runtime executions only
   * const topScoped = await memory.getTopSpaces({
   *   startTime: new Date('2026-05-01T00:00:00Z'),
   *   endTime: new Date('2026-06-01T00:00:00Z'),
   *   folderKeys: ['<folderKey>'],
   *   executionType: AgentMemoryExecutionType.Runtime,
   *   limit: 10,
   * });
   * ```
   */
  getTopSpaces(options?: AgentMemoryGetTopSpacesOptions): Promise<AgentMemoryGetTopSpacesResponse[]>;
}
