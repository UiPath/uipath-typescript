import { BaseService } from '../../base';
import {
  MemoryFilterOptions,
  MemoryGetTimelineOptions,
  MemoryGetTimelineResponse,
  MemoryGetCallsTimelineOptions,
  MemoryGetCallsTimelineResponse,
  MemoryGetTopSpacesOptions,
  MemoryGetTopSpacesResponse,
} from '../../../models/agents/memory/memory.types';
import { MemoryServiceModel } from '../../../models/agents/memory/memory.models';
import { MEMORY_ENDPOINTS } from '../../../utils/constants/endpoints';
import { track } from '../../../core/telemetry';

/**
 * Service for interacting with UiPath Agent Memory metrics.
 */
export class MemoryService extends BaseService implements MemoryServiceModel {
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
  @track('Memory.GetTimeline')
  async getTimeline(options?: MemoryGetTimelineOptions): Promise<MemoryGetTimelineResponse> {
    const body = this.buildMemoryFilterBody(options);

    const response = await this.post<MemoryGetTimelineResponse>(
      MEMORY_ENDPOINTS.GET_TIMELINE,
      body,
    );

    return response.data;
  }

  /**
   * Retrieves a time-series of memory-call counts bucketed across the requested
   * window.
   *
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
  @track('Memory.GetCallsTimeline')
  async getCallsTimeline(
    options?: MemoryGetCallsTimelineOptions,
  ): Promise<MemoryGetCallsTimelineResponse> {
    const body = this.buildMemoryFilterBody(options);

    const response = await this.post<MemoryGetCallsTimelineResponse>(
      MEMORY_ENDPOINTS.GET_CALLS_TIMELINE,
      body,
    );

    return response.data;
  }

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
  @track('Memory.GetTopSpaces')
  async getTopSpaces(
    options?: MemoryGetTopSpacesOptions,
  ): Promise<MemoryGetTopSpacesResponse> {
    const body = this.buildMemoryFilterBody(options);
    if (options?.limit !== undefined) body.limit = options.limit;

    const response = await this.post<MemoryGetTopSpacesResponse>(
      MEMORY_ENDPOINTS.GET_TOP_SPACES,
      body,
    );

    return response.data;
  }

  private buildMemoryFilterBody(options?: MemoryFilterOptions): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (options?.startTime !== undefined) body.startTime = options.startTime;
    if (options?.endTime !== undefined) body.endTime = options.endTime;
    if (options?.agentId !== undefined) body.agentId = options.agentId;
    if (options?.agentVersion !== undefined) body.agentVersion = options.agentVersion;
    if (options?.folderKeys !== undefined) body.folderKeys = options.folderKeys;
    if (options?.executionType !== undefined) body.executionType = options.executionType;
    return body;
  }
}
