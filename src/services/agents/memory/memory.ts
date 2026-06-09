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
 * Service for managing UiPath Agent Memory.
 */
export class MemoryService extends BaseService implements MemoryServiceModel {
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
  @track('Memory.GetTimeline')
  async getTimeline(options?: MemoryGetTimelineOptions): Promise<MemoryGetTimelineResponse[]> {
    const body = this.buildMemoryFilterBody(options);

    const response = await this.post<{ data?: MemoryGetTimelineResponse[] }>(
      MEMORY_ENDPOINTS.GET_TIMELINE,
      body,
    );

    return response.data.data ?? [];
  }

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
  @track('Memory.GetCallsTimeline')
  async getCallsTimeline(
    options?: MemoryGetCallsTimelineOptions,
  ): Promise<MemoryGetCallsTimelineResponse[]> {
    const body = this.buildMemoryFilterBody(options);

    const response = await this.post<{ data?: MemoryGetCallsTimelineResponse[] }>(
      MEMORY_ENDPOINTS.GET_CALLS_TIMELINE,
      body,
    );

    return response.data.data ?? [];
  }

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
  @track('Memory.GetTopSpaces')
  async getTopSpaces(
    options?: MemoryGetTopSpacesOptions,
  ): Promise<MemoryGetTopSpacesResponse[]> {
    const body = this.buildMemoryFilterBody(options);
    if (options?.limit !== undefined) body.limit = options.limit;

    const response = await this.post<{ data?: MemoryGetTopSpacesResponse[] }>(
      MEMORY_ENDPOINTS.GET_TOP_SPACES,
      body,
    );

    return response.data.data ?? [];
  }

  private buildMemoryFilterBody(options?: MemoryFilterOptions): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (options?.startTime !== undefined) body.startTime = options.startTime.toISOString();
    if (options?.endTime !== undefined) body.endTime = options.endTime.toISOString();
    if (options?.agentId !== undefined) body.agentId = options.agentId;
    if (options?.agentVersion !== undefined) body.agentVersion = options.agentVersion;
    if (options?.folderKeys !== undefined) body.folderKeys = options.folderKeys;
    if (options?.executionType !== undefined) body.executionType = options.executionType;
    return body;
  }
}
