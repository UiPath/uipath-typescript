import { BaseService } from '../../base';
import {
  AgentMemoryFilterOptions,
  AgentMemoryGetTimelineOptions,
  AgentMemoryGetTimelineResponse,
  AgentMemoryGetCallsTimelineOptions,
  AgentMemoryGetCallsTimelineResponse,
  AgentMemoryGetTopSpacesOptions,
  AgentMemoryGetTopSpacesResponse,
} from '../../../models/agents/memory/memory.types';
import { AgentMemoryServiceModel } from '../../../models/agents/memory/memory.models';
import { MEMORY_ENDPOINTS } from '../../../utils/constants/endpoints';
import { track } from '../../../core/telemetry';

/**
 * Service for managing UiPath Agent Memory.
 */
export class MemoryService extends BaseService implements AgentMemoryServiceModel {
  /**
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
  @track('AgentMemory.GetTimeline')
  async getTimeline(options?: AgentMemoryGetTimelineOptions): Promise<AgentMemoryGetTimelineResponse[]> {
    const body = this.buildMemoryFilterBody(options);

    const response = await this.post<{ data: AgentMemoryGetTimelineResponse[] }>(
      MEMORY_ENDPOINTS.GET_TIMELINE,
      body,
    );

    return response.data.data;
  }

  /**
   * Gets agent memory-access counts over time, with optional filters.
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
  @track('AgentMemory.GetCallsTimeline')
  async getCallsTimeline(
    options?: AgentMemoryGetCallsTimelineOptions,
  ): Promise<AgentMemoryGetCallsTimelineResponse[]> {
    const body = this.buildMemoryFilterBody(options);

    const response = await this.post<{ data: AgentMemoryGetCallsTimelineResponse[] }>(
      MEMORY_ENDPOINTS.GET_CALLS_TIMELINE,
      body,
    );

    return response.data.data;
  }

  /**
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
  @track('AgentMemory.GetTopSpaces')
  async getTopSpaces(
    options?: AgentMemoryGetTopSpacesOptions,
  ): Promise<AgentMemoryGetTopSpacesResponse[]> {
    const body = this.buildMemoryFilterBody(options);
    if (options?.limit !== undefined) body.limit = options.limit;

    const response = await this.post<{ data: AgentMemoryGetTopSpacesResponse[] }>(
      MEMORY_ENDPOINTS.GET_TOP_SPACES,
      body,
    );

    return response.data.data;
  }

  private buildMemoryFilterBody(options?: AgentMemoryFilterOptions): Record<string, unknown> {
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
