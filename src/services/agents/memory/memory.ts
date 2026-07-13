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
  @track('AgentMemory.GetTimeline')
  async getTimeline(options?: AgentMemoryGetTimelineOptions): Promise<AgentMemoryGetTimelineResponse[]> {
    const body = this.buildMemoryFilterBody(options);

    const response = await this.post<{ data: AgentMemoryGetTimelineResponse[] }>(
      MEMORY_ENDPOINTS.GET_TIMELINE,
      body,
    );

    return response.data.data;
  }

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
