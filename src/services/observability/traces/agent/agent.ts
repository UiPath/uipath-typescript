import { BaseService } from '../../../base';
import {
  AgentTraceFilterOptions,
  AgentTraceGetErrorsTimelineOptions,
  AgentTraceGetErrorsTimelineResponse,
  AgentTraceGetLatencyTimelineOptions,
  AgentTraceGetLatencyTimelineResponse,
  AgentTraceGetUnitConsumptionOptions,
  AgentTraceGetUnitConsumptionResponse,
  AgentSpanGetResponse,
  AgentTraceGetSpansByReferenceOptions,
  AgentGovernanceDecisionGetResponse,
  AgentGovernanceDecisionsOptions,
  AgentGovernanceGetSummaryResponse,
  AgentGovernanceSummaryOptions,
  AgentGovernanceMode,
  AgentGovernanceVerdict,
} from '../../../../models/observability/traces/agent/agent.types';
import { AgentTracesServiceModel } from '../../../../models/observability/traces/agent/agent.models';
import {
  RawAgentSpanGetResponse,
  RawAgentGovernanceDecisionGetResponse,
} from '../../../../models/observability/traces/agent/agent.internal-types';
import { AGENT_TRACES_ENDPOINTS } from '../../../../utils/constants/endpoints';
import {
  HTTP_METHODS,
  AGENTS_OFFSET_PARAMS,
  TRACEVIEW_SPANS_PAGINATION,
  GOVERNANCE_DECISIONS_PAGINATION,
} from '../../../../utils/constants/common';
import { track } from '../../../../core/telemetry';
import { ValidationError } from '../../../../core/errors';
import { PaginationHelpers } from '../../../../utils/pagination/helpers';
import { PaginationType } from '../../../../utils/pagination/internal-types';
import type {
  HasPaginationOptions,
  NonPaginatedResponse,
  PaginatedResponse,
} from '../../../../utils/pagination/types';

/**
 * Maps a raw span record to a {@link AgentSpanGetResponse}
 */
const transformSpan = (span: RawAgentSpanGetResponse): AgentSpanGetResponse => {
  const { expiryTimeUtc, ...rest } = span;
  return { ...rest, expiredTime: expiryTimeUtc };
};

// Case-insensitive lookups from a raw API value → enum member (keys upper-cased).
const GOVERNANCE_MODE_BY_VALUE = new Map<string, AgentGovernanceMode>(
  Object.values(AgentGovernanceMode).map((mode) => [mode.toUpperCase(), mode]),
);
const GOVERNANCE_VERDICT_BY_VALUE = new Map<string, AgentGovernanceVerdict>(
  Object.values(AgentGovernanceVerdict).map((verdict) => [verdict.toUpperCase(), verdict]),
);

/** Maps a raw mode string to {@link AgentGovernanceMode}, case-insensitively; missing/unrecognized → `Unknown`. */
const toGovernanceMode = (raw: string | null): AgentGovernanceMode =>
  (raw != null ? GOVERNANCE_MODE_BY_VALUE.get(raw.toUpperCase()) : undefined) ?? AgentGovernanceMode.Unknown;

/** Maps a raw verdict string to {@link AgentGovernanceVerdict}, case-insensitively; missing/unrecognized → `Unknown`. */
const toGovernanceVerdict = (raw: string | null): AgentGovernanceVerdict =>
  (raw != null ? GOVERNANCE_VERDICT_BY_VALUE.get(raw.toUpperCase()) : undefined) ?? AgentGovernanceVerdict.Unknown;

/**
 * Normalizes a raw governance row, mapping the mode and verdict strings to
 * their enums while leaving the other fields untouched.
 */
const transformGovernanceDecision = (row: RawAgentGovernanceDecisionGetResponse): AgentGovernanceDecisionGetResponse => ({
  ...row,
  mode: toGovernanceMode(row.mode),
  evaluatorResult: toGovernanceVerdict(row.evaluatorResult),
});

/**
 * Service for retrieving UiPath Agent trace metrics.
 */
export class AgentTracesService extends BaseService implements AgentTracesServiceModel {
  @track('AgentTraces.GetErrorsTimeline')
  async getErrorsTimeline(
    options?: AgentTraceGetErrorsTimelineOptions,
  ): Promise<AgentTraceGetErrorsTimelineResponse[]> {
    const response = await this.post<{ data: AgentTraceGetErrorsTimelineResponse[] }>(
      AGENT_TRACES_ENDPOINTS.GET_ERRORS_TIMELINE,
      this.buildTraceFilterBody(options),
    );
    return response.data.data;
  }

  @track('AgentTraces.GetLatencyTimeline')
  async getLatencyTimeline(
    options?: AgentTraceGetLatencyTimelineOptions,
  ): Promise<AgentTraceGetLatencyTimelineResponse[]> {
    const response = await this.post<{ data: AgentTraceGetLatencyTimelineResponse[] }>(
      AGENT_TRACES_ENDPOINTS.GET_LATENCY_TIMELINE,
      this.buildTraceFilterBody(options),
    );
    return response.data.data;
  }

  @track('AgentTraces.GetUnitConsumption')
  async getUnitConsumption(
    options?: AgentTraceGetUnitConsumptionOptions,
  ): Promise<AgentTraceGetUnitConsumptionResponse[]> {
    const response = await this.post<{ data: AgentTraceGetUnitConsumptionResponse[] }>(
      AGENT_TRACES_ENDPOINTS.GET_UNIT_CONSUMPTION,
      this.buildTraceFilterBody(options),
    );
    return response.data.data;
  }

  @track('AgentTraces.GetSpansByTraceId')
  async getSpansByTraceId(traceId: string): Promise<AgentSpanGetResponse[]> {
    if (!traceId) throw new ValidationError({ message: 'traceId is required for getSpansByTraceId' });
    const response = await this.get<RawAgentSpanGetResponse[]>(AGENT_TRACES_ENDPOINTS.GET_SPANS_BY_TRACE_ID(traceId));
    return (response.data ?? []).map(transformSpan);
  }

  @track('AgentTraces.GetSpansByReference')
  async getSpansByReference<T extends AgentTraceGetSpansByReferenceOptions = AgentTraceGetSpansByReferenceOptions>(
    referenceId: string,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<AgentSpanGetResponse>
      : NonPaginatedResponse<AgentSpanGetResponse>
  > {
    if (!referenceId) throw new ValidationError({ message: 'referenceId is required for getSpansByReference' });
    const { startTime, endTime, ...rest } = options ?? {};
    const apiOptions = {
      ...rest,
      ...(startTime !== undefined ? { startTime: startTime.toISOString() } : {}),
      ...(endTime !== undefined ? { endTime: endTime.toISOString() } : {}),
    };

    return PaginationHelpers.getAll<typeof apiOptions, RawAgentSpanGetResponse, AgentSpanGetResponse>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => AGENT_TRACES_ENDPOINTS.GET_SPANS_BY_REFERENCE(referenceId),
      method: HTTP_METHODS.GET,
      transformFn: transformSpan,
      excludeFromPrefix: Object.keys(apiOptions),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: TRACEVIEW_SPANS_PAGINATION.ITEMS_FIELD,
        totalCountField: TRACEVIEW_SPANS_PAGINATION.TOTAL_COUNT_FIELD,
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
        ? PaginatedResponse<AgentSpanGetResponse>
        : NonPaginatedResponse<AgentSpanGetResponse>
    >;
  }

  @track('AgentTraces.GetGovernanceDecisions')
  async getGovernanceDecisions<T extends AgentGovernanceDecisionsOptions = AgentGovernanceDecisionsOptions>(
    startTime: Date,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<AgentGovernanceDecisionGetResponse>
      : NonPaginatedResponse<AgentGovernanceDecisionGetResponse>
  > {
    const { endTime, ...rest } = options ?? {};
    const apiOptions = {
      ...rest,
      startTime: startTime.toISOString(),
      ...(endTime !== undefined ? { endTime: endTime.toISOString() } : {}),
    };

    return PaginationHelpers.getAll<typeof apiOptions, RawAgentGovernanceDecisionGetResponse, AgentGovernanceDecisionGetResponse>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => AGENT_TRACES_ENDPOINTS.GET_GOVERNANCE_DECISIONS,
      method: HTTP_METHODS.POST,
      transformFn: transformGovernanceDecision,
      excludeFromPrefix: Object.keys(apiOptions),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: GOVERNANCE_DECISIONS_PAGINATION.ITEMS_FIELD,
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
        ? PaginatedResponse<AgentGovernanceDecisionGetResponse>
        : NonPaginatedResponse<AgentGovernanceDecisionGetResponse>
    >;
  }

  @track('AgentTraces.GetGovernanceSummary')
  async getGovernanceSummary(
    startTime: Date,
    options?: AgentGovernanceSummaryOptions,
  ): Promise<AgentGovernanceGetSummaryResponse> {
    const body: Record<string, unknown> = { startTime: startTime.toISOString() };
    if (options?.endTime !== undefined) body.endTime = options.endTime.toISOString();
    if (options?.topN !== undefined) body.topN = options.topN;
    if (options?.packName !== undefined) body.packName = options.packName;
    if (options?.sections !== undefined) body.sections = options.sections;

    const response = await this.post<AgentGovernanceGetSummaryResponse>(
      AGENT_TRACES_ENDPOINTS.GET_GOVERNANCE_SUMMARY,
      body,
    );
    return response.data;
  }

  private buildTraceFilterBody(
    options?: AgentTraceFilterOptions,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (options?.startTime !== undefined) body.startTime = options.startTime.toISOString();
    if (options?.endTime !== undefined) body.endTime = options.endTime.toISOString();
    if (options?.folderKeys !== undefined) body.folderKeys = options.folderKeys;
    if (options?.agentId !== undefined) body.agentId = options.agentId;
    if (options?.agentVersion !== undefined) body.agentVersion = options.agentVersion;
    if (options?.executionType !== undefined) body.executionType = options.executionType;
    return body;
  }
}
