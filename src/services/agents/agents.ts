import { BaseService } from '../base';
import {
  AgentErrorsTimelineOptions,
  AgentErrorsTimelineResponse,
  AgentFilterOptions,
  AgentNamesGetAllOptions,
  AgentNamesGetAllResponse,
  AgentTopErroredAgentsOptions,
  AgentTopErroredAgentsResponse,
} from '../../models/agents/agents.types';
import { AgentServiceModel } from '../../models/agents/agents.models';
import { AGENTS_ENDPOINTS } from '../../utils/constants/endpoints';
import { camelToPascalCaseKeys } from '../../utils/transform';
import { track } from '../../core/telemetry';

/**
 * Service for interacting with the UiPath Agents API.
 */
export class AgentService extends BaseService implements AgentServiceModel {
  /**
   * Lists all distinct agent names on the given tenant.
   *
   * The tenant is inferred from the authenticated JWT. Optionally scope the
   * lookup to a list of folder keys.
   *
   * @param options - Optional folder-key scoping {@link AgentNamesGetAllOptions}
   * @returns Promise resolving to {@link AgentNamesGetAllResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // List all agent names on the tenant
   * const result = await agents.getNames();
   * console.log(result.agents);
   * ```
   * @example
   * ```typescript
   * // Scope to specific folders
   * const result = await agents.getNames({
   *   folderKeys: ['<folderKey1>', '<folderKey2>'],
   * });
   * ```
   */
  @track('Agents.GetNames')
  async getNames(options?: AgentNamesGetAllOptions): Promise<AgentNamesGetAllResponse> {
    const input: Record<string, unknown> = {};
    if (options?.folderKeys !== undefined) input.folderKeys = options.folderKeys;

    const response = await this.post<AgentNamesGetAllResponse>(
      AGENTS_ENDPOINTS.GET_NAMES,
      camelToPascalCaseKeys(input)
    );

    return response.data;
  }

  /**
   * Retrieves a time-series of error counts grouped by agent over the requested window.
   *
   * Returns one data point per (agent, time bucket). Bucket size is chosen
   * server-side based on the window length. Optionally filter by folder, agent
   * name, project, or process version.
   *
   * @param startTime - Inclusive lower bound for the query window (ISO 8601, UTC)
   * @param endTime - Exclusive upper bound for the query window (ISO 8601, UTC)
   * @param options - Optional filters {@link AgentErrorsTimelineOptions}
   * @returns Promise resolving to {@link AgentErrorsTimelineResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // All errors in May 2025
   * const result = await agents.getErrorsTimeline(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   * );
   * result.data?.forEach((point) => {
   *   console.log(`${point.date} ${point.name}: ${point.value} errors`);
   * });
   * ```
   * @example
   * ```typescript
   * // Scope to specific folders and top 5 agents
   * const result = await agents.getErrorsTimeline(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   *   {
   *     folderKeys: ['<folderKey1>'],
   *     agentNames: ['JokeAgent', 'StoryAgent'],
   *     limit: 5,
   *   },
   * );
   * ```
   */
  @track('Agents.GetErrorsTimeline')
  async getErrorsTimeline(
    startTime: string,
    endTime: string,
    options?: AgentErrorsTimelineOptions,
  ): Promise<AgentErrorsTimelineResponse> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);

    const response = await this.post<AgentErrorsTimelineResponse>(
      AGENTS_ENDPOINTS.GET_ERRORS_TIMELINE,
      body,
    );

    return response.data;
  }

  /**
   * Retrieves the top-N agents by error count over the requested window.
   *
   * Returns one entry per agent, ranked by error count, with the first and
   * last failing jobs included to anchor the error window. Optionally filter
   * by folder, agent name, project, or process version.
   *
   * @param startTime - Inclusive lower bound for the query window (ISO 8601, UTC)
   * @param endTime - Exclusive upper bound for the query window (ISO 8601, UTC)
   * @param options - Optional filters {@link AgentTopErroredAgentsOptions}
   * @returns Promise resolving to {@link AgentTopErroredAgentsResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Top errored agents in May 2025
   * const result = await agents.getTopErroredAgents(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   * );
   * console.log(`Total errors: ${result.totalErrors}`);
   * result.data?.forEach((agent) => {
   *   console.log(`${agent.name}: ${agent.count} errors`);
   * });
   * ```
   * @example
   * ```typescript
   * // Top 5 errored agents in specific folders
   * const result = await agents.getTopErroredAgents(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   *   {
   *     folderKeys: ['<folderKey1>'],
   *     limit: 5,
   *   },
   * );
   * ```
   */
  @track('Agents.GetTopErroredAgents')
  async getTopErroredAgents(
    startTime: string,
    endTime: string,
    options?: AgentTopErroredAgentsOptions,
  ): Promise<AgentTopErroredAgentsResponse> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);

    const response = await this.post<AgentTopErroredAgentsResponse>(
      AGENTS_ENDPOINTS.GET_TOP_ERRORED_AGENTS,
      body,
    );

    return response.data;
  }

  private buildAgentFilterBody(
    startTime: string,
    endTime: string,
    options?: AgentFilterOptions & { limit?: number },
  ): Record<string, unknown> {
    const body: Record<string, unknown> = { startTime, endTime };
    if (options?.folderKeys !== undefined) body.folderKeys = options.folderKeys;
    if (options?.agentNames !== undefined) body.agentNames = options.agentNames;
    if (options?.projectKeys !== undefined) body.projectKeys = options.projectKeys;
    if (options?.agentId !== undefined) body.agentId = options.agentId;
    if (options?.processVersion !== undefined) body.processVersion = options.processVersion;
    if (options?.limit !== undefined) body.limit = options.limit;
    return body;
  }
}
