import { BaseService } from '../base';
import {
  AgentGetConsumptionTimelineOptions,
  AgentGetConsumptionTimelineResponse,
  AgentError,
  AgentGetErrorsOptions,
  AgentGetErrorsTimelineOptions,
  AgentGetErrorsTimelineResponse,
  AgentFilterOptions,
  AgentGetLatencyTimelineOptions,
  AgentGetLatencyTimelineResponse,
  AgentGetTopErrorCountOptions,
  AgentGetTopErrorCountResponse,
  AgentGetTopConsumptionOptions,
  AgentGetTopConsumptionResponse,
  AgentGetIncidentDistributionOptions,
  AgentGetIncidentDistributionResponse,
  AgentGetSummaryOptions,
  AgentGetSummaryResponse,
  AgentSummaryPeriod,
  AgentGetUnitConsumptionSummaryOptions,
  AgentGetUnitConsumptionSummaryResponse,
  AgentListItem,
  AgentGetAllOptions,
} from '../../models/agents/agents.types';
import { AgentServiceModel } from '../../models/agents/agents.models';
import type {
  RawAgentGetSummaryResponse,
  RawAgentSummaryPeriod,
} from '../../models/agents/agents.internal-types';
import { JobState } from '../../models/common/types';
import { AGENTS_ENDPOINTS } from '../../utils/constants/endpoints';
import {
  HTTP_METHODS,
  AGENTS_PAGINATION,
  AGENTS_INCIDENTS_PAGINATION,
  AGENTS_OFFSET_PARAMS,
} from '../../utils/constants/common';
import { track } from '../../core/telemetry';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { PaginationType } from '../../utils/pagination/internal-types';
import type {
  HasPaginationOptions,
  NonPaginatedResponse,
  PaginatedResponse,
} from '../../utils/pagination/types';

const JOB_STATUS_ALIASES: Record<string, JobState> = {
  Success: JobState.Successful,
};

const VALID_JOB_STATES = new Set<string>(Object.values(JobState));

/**
 * Permissively maps a raw `lastJobStatus` string to a {@link JobState}. Known
 * aliases are translated first, canonical values pass through, and anything
 * unrecognized falls back to {@link JobState.Unknown} rather than throwing.
 */
function toJobState(raw: string): JobState {
  if (Object.prototype.hasOwnProperty.call(JOB_STATUS_ALIASES, raw)) return JOB_STATUS_ALIASES[raw];
  if (VALID_JOB_STATES.has(raw)) return raw as JobState;
  return JobState.Unknown;
}

/**
 * Transforms a raw summary period into the public shape, normalizing every
 * agent's raw `lastJobStatus` string to a {@link JobState}. Tolerates a missing
 * `agents` array (treated as empty).
 */
function normalizeSummaryPeriod(period: RawAgentSummaryPeriod): AgentSummaryPeriod {
  return {
    ...period,
    agents: (period.agents ?? []).map((agent) => ({ ...agent, lastJobStatus: toJobState(agent.lastJobStatus) })),
  };
}

/**
 * Service for interacting with the UiPath Agents API.
 */
export class AgentService extends BaseService implements AgentServiceModel {
  @track('Agents.GetAll')
  async getAll<T extends AgentGetAllOptions = AgentGetAllOptions>(
    startTime: Date,
    endTime: Date,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<AgentListItem>
      : NonPaginatedResponse<AgentListItem>
  > {
    const apiOptions = { ...options, startTime: startTime.toISOString(), endTime: endTime.toISOString() };

    return PaginationHelpers.getAll<typeof apiOptions, AgentListItem>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => AGENTS_ENDPOINTS.GET_AGENTS,
      method: HTTP_METHODS.POST,
      excludeFromPrefix: Object.keys(apiOptions),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: AGENTS_PAGINATION.ITEMS_FIELD,
        totalCountField: AGENTS_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: AGENTS_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: AGENTS_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: AGENTS_OFFSET_PARAMS.COUNT_PARAM,
          convertToSkip: false,
          zeroBased: true,
        },
      },
    }, apiOptions) as Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<AgentListItem>
        : NonPaginatedResponse<AgentListItem>
    >;
  }

  @track('Agents.GetErrors')
  async getErrors<T extends AgentGetErrorsOptions = AgentGetErrorsOptions>(
    startTime: Date,
    endTime: Date,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<AgentError>
      : NonPaginatedResponse<AgentError>
  > {
    const apiOptions = { ...options, startTime: startTime.toISOString(), endTime: endTime.toISOString() };

    return PaginationHelpers.getAll<typeof apiOptions, AgentError>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => AGENTS_ENDPOINTS.GET_INCIDENTS,
      method: HTTP_METHODS.POST,
      excludeFromPrefix: Object.keys(apiOptions),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: AGENTS_INCIDENTS_PAGINATION.ITEMS_FIELD,
        totalCountField: AGENTS_INCIDENTS_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: AGENTS_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: AGENTS_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: AGENTS_OFFSET_PARAMS.COUNT_PARAM,
          convertToSkip: false,
          zeroBased: true,
        },
      },
    }, apiOptions) as Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<AgentError>
        : NonPaginatedResponse<AgentError>
    >;
  }

  @track('Agents.GetErrorsTimeline')
  async getErrorsTimeline(
    startTime: Date,
    endTime: Date,
    options?: AgentGetErrorsTimelineOptions,
  ): Promise<AgentGetErrorsTimelineResponse[]> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);

    const response = await this.post<{ data: AgentGetErrorsTimelineResponse[] }>(
      AGENTS_ENDPOINTS.GET_ERRORS_TIMELINE,
      body,
    );

    return response.data.data;
  }

  @track('Agents.GetConsumptionTimeline')
  async getConsumptionTimeline(
    startTime: Date,
    endTime: Date,
    options?: AgentGetConsumptionTimelineOptions,
  ): Promise<AgentGetConsumptionTimelineResponse[]> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);

    const response = await this.post<{ data: AgentGetConsumptionTimelineResponse[] }>(
      AGENTS_ENDPOINTS.GET_CONSUMPTION_TIMELINE,
      body,
    );

    return response.data.data;
  }

  @track('Agents.GetLatencyTimeline')
  async getLatencyTimeline(
    startTime: Date,
    endTime: Date,
    options?: AgentGetLatencyTimelineOptions,
  ): Promise<AgentGetLatencyTimelineResponse[]> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);

    const response = await this.post<{ data: AgentGetLatencyTimelineResponse[] }>(
      AGENTS_ENDPOINTS.GET_LATENCY_TIMELINE,
      body,
    );

    return response.data.data;
  }

  @track('Agents.GetTopErrorCount')
  async getTopErrorCount(
    startTime: Date,
    endTime: Date,
    options?: AgentGetTopErrorCountOptions,
  ): Promise<AgentGetTopErrorCountResponse> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);

    const response = await this.post<AgentGetTopErrorCountResponse>(
      AGENTS_ENDPOINTS.GET_TOP_ERROR_COUNT,
      body,
    );

    return response.data;
  }

  @track('Agents.GetTopConsumption')
  async getTopConsumption(
    startTime: Date,
    endTime: Date,
    options?: AgentGetTopConsumptionOptions,
  ): Promise<AgentGetTopConsumptionResponse> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);
    if (options?.healthy !== undefined) body.healthy = options.healthy;
    if (options?.healthThreshold !== undefined) body.healthThreshold = options.healthThreshold;
    if (options?.agentTypes?.length) body.agentTypes = options.agentTypes.join(',');

    const response = await this.post<{ data: AgentGetTopConsumptionResponse }>(
      AGENTS_ENDPOINTS.GET_TOP_CONSUMPTION,
      body,
    );

    return response.data.data;
  }

  @track('Agents.GetIncidentDistribution')
  async getIncidentDistribution(
    startTime: Date,
    endTime: Date,
    options?: AgentGetIncidentDistributionOptions,
  ): Promise<AgentGetIncidentDistributionResponse> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);

    const response = await this.post<{ data: AgentGetIncidentDistributionResponse }>(
      AGENTS_ENDPOINTS.GET_INCIDENT_DISTRIBUTION,
      body,
    );

    return response.data.data;
  }

  @track('Agents.GetSummary')
  async getSummary(
    startTime: Date,
    endTime: Date,
    options?: AgentGetSummaryOptions,
  ): Promise<AgentGetSummaryResponse> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);
    if (options?.lookbackPeriodAnalysis !== undefined) body.lookbackPeriodAnalysis = options.lookbackPeriodAnalysis;
    if (options?.processKey !== undefined) body.processKey = options.processKey;
    if (options?.folderKey !== undefined) body.folderKey = options.folderKey;
    if (options?.executionType !== undefined) body.executionType = options.executionType;

    const response = await this.post<{ data: RawAgentGetSummaryResponse }>(
      AGENTS_ENDPOINTS.GET_SUMMARY,
      body,
    );

    const summary = response.data.data;
    return {
      currentPeriodSummary: normalizeSummaryPeriod(summary.currentPeriodSummary),
      lookbackPeriodSummary: summary.lookbackPeriodSummary
        ? normalizeSummaryPeriod(summary.lookbackPeriodSummary)
        : undefined,
    };
  }

  @track('Agents.GetUnitConsumptionSummary')
  async getUnitConsumptionSummary(
    startTime: Date,
    endTime: Date,
    options?: AgentGetUnitConsumptionSummaryOptions,
  ): Promise<AgentGetUnitConsumptionSummaryResponse> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);
    if (options?.lookbackPeriodAnalysis !== undefined) body.lookbackPeriodAnalysis = options.lookbackPeriodAnalysis;
    if (options?.processKey !== undefined) body.processKey = options.processKey;
    if (options?.folderKey !== undefined) body.folderKey = options.folderKey;
    if (options?.executionType !== undefined) body.executionType = options.executionType;

    const response = await this.post<{ data: AgentGetUnitConsumptionSummaryResponse }>(
      AGENTS_ENDPOINTS.GET_UNIT_CONSUMPTION_SUMMARY,
      body,
    );

    return response.data.data;
  }

  /**
   * Builds the common POST request body shared by the agent filter endpoints —
   * the required time window plus any optional folder/agent/project/process
   * filters. Undefined options are omitted so the server applies its defaults.
   */
  private buildAgentFilterBody(
    startTime: Date,
    endTime: Date,
    options?: AgentFilterOptions & { limit?: number },
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };
    if (options?.folderKeys !== undefined) body.folderKeys = options.folderKeys;
    if (options?.agentNames !== undefined) body.agentNames = options.agentNames;
    if (options?.projectKeys !== undefined) body.projectKeys = options.projectKeys;
    if (options?.agentId !== undefined) body.agentId = options.agentId;
    if (options?.processVersion !== undefined) body.processVersion = options.processVersion;
    if (options?.limit !== undefined) body.limit = options.limit;
    return body;
  }
}
