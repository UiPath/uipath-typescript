import { BaseService } from '../../base';
import {
  MemoryFilterOptions,
  MemoryTimelineGetOptions,
  MemoryTimelineResponse,
} from '../../../models/agents/memory/memory.types';
import { MemoryServiceModel } from '../../../models/agents/memory/memory.models';
import { MEMORY_ENDPOINTS } from '../../../utils/constants/endpoints';
import { track } from '../../../core/telemetry';

/**
 * Service for interacting with UiPath Agent Memory analytics (Traceview).
 */
export class MemoryService extends BaseService implements MemoryServiceModel {
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
  @track('Memory.GetMemoryTimeline')
  async getMemoryTimeline(options?: MemoryTimelineGetOptions): Promise<MemoryTimelineResponse> {
    const body = this.buildMemoryFilterBody(options);

    const response = await this.post<MemoryTimelineResponse>(
      MEMORY_ENDPOINTS.GET_MEMORY_TIMELINE,
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
