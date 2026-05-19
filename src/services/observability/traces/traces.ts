import { BaseService } from '../../base';
import {
  SpanResponse,
  SpanStatus,
  SpanSource,
  SpanVerbosityLevel,
  SpanAttachmentProvider,
  SpanAttachmentDirection,
  TracesGetByTraceIdOptions,
  TracesGetByAgentIdOptions,
  TracesGetByReferenceIdOptions,
} from '../../../models/observability/traces/traces.types';
import { TracesServiceModel } from '../../../models/observability/traces/traces.models';
import {
  SpanStatusMap,
  SpanSourceMap,
  SpanVerbosityLevelMap,
  SpanExecutionTypeMap,
  SpanPermissionStatusMap,
  SpanAttachmentProviderMap,
  SpanAttachmentDirectionMap,
} from '../../../models/observability/traces/traces.constants';
import {
  RawSpanOtelResponse,
  RawSpanOtelPageResponse,
  RawSpanAgentResponse,
} from '../../../models/observability/traces/traces.internal-types';
import { TRACES_ENDPOINTS } from '../../../utils/constants/endpoints';
import type { QueryParams } from '../../../models/common/request-spec';
import {
  PaginatedResponse,
  NonPaginatedResponse,
  HasPaginationOptions,
} from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { TRACES_AGENT_PAGINATION, TRACES_AGENT_OFFSET_PARAMS } from '../../../utils/constants/common';
import { track } from '../../../core/telemetry';
import { ValidationError } from '../../../core/errors';

export class TracesService extends BaseService implements TracesServiceModel {

  private transformOtelSpan(raw: RawSpanOtelResponse): SpanResponse {
    return {
      id: raw.Id,
      traceId: raw.TraceId,
      parentId: raw.ParentId,
      name: raw.Name,
      startTime: raw.StartTime,
      endTime: raw.EndTime,
      attributes: raw.Attributes,
      status: SpanStatusMap[raw.Status] ?? SpanStatus.Unset,
      source: raw.Source != null ? (SpanSourceMap[raw.Source] ?? null) : null,
      spanType: raw.SpanType,
      verbosityLevel: raw.VerbosityLevel != null ? (SpanVerbosityLevelMap[raw.VerbosityLevel] ?? null) : null,
      executionType: raw.ExecutionType != null ? (SpanExecutionTypeMap[raw.ExecutionType] ?? null) : null,
      folderKey: raw.FolderKey,
      referenceId: raw.ReferenceId,
      referenceVersion: raw.ReferenceVersion,
      agentVersion: raw.AgentVersion,
      organizationId: raw.OrganizationId,
      tenantId: raw.TenantId,
      processKey: raw.ProcessKey,
      jobKey: raw.JobKey,
      updatedAt: raw.UpdatedAt,
      expiryTimeUtc: raw.ExpiryTimeUtc,
      context: raw.Context
        ? {
            referenceHierarchy: raw.Context.ReferenceHierarchy.map(entry => ({
              serviceType: entry.ServiceType,
              referenceId: entry.ReferenceId,
              version: entry.Version,
            })),
          }
        : null,
      attachments: raw.Attachments
        ? raw.Attachments.map(a => ({
            provider: SpanAttachmentProviderMap[a.Provider] ?? SpanAttachmentProvider.Orchestrator,
            id: a.Id,
            fileName: a.FileName,
            mimeType: a.MimeType,
            direction: SpanAttachmentDirectionMap[a.Direction] ?? SpanAttachmentDirection.None,
          }))
        : null,
      permissionStatus: raw.PermissionStatus != null ? (SpanPermissionStatusMap[raw.PermissionStatus] ?? null) : null,
    };
  }

  /**
   * Gets all spans for a specific trace ID.
   *
   * Returns up to `pageSize` spans (default 1000) in a single fetch.
   * Accepts both GUID format and OTEL 32-char hex format — the API normalizes both.
   *
   * @param traceId - Trace identifier
   * @param options - Optional filters {@link TracesGetByTraceIdOptions}
   * @returns Promise resolving to an array of {@link SpanResponse}
   * @example
   * ```typescript
   * import { Traces } from '@uipath/uipath-typescript/traces';
   *
   * const traces = new Traces(sdk);
   * const spans = await traces.getByTraceId('<traceId>');
   * console.log(spans.length, spans[0].spanType, spans[0].status);
   * ```
   * @example
   * ```typescript
   * // Filter to a specific agent's spans
   * const agentSpans = await traces.getByTraceId('<traceId>', {
   *   agentId: '<agentId>',
   *   pageSize: 500,
   * });
   * ```
   */
  @track('Traces.GetByTraceId')
  async getByTraceId(traceId: string, options?: TracesGetByTraceIdOptions): Promise<SpanResponse[]> {
    if (!traceId) throw new ValidationError({ message: 'traceId is required for getByTraceId' });

    const { pageSize = 1000, agentId, isHistorical } = options ?? {};
    const params: QueryParams = { traceId, pageSize };
    if (agentId !== undefined) params.agentId = agentId;
    if (isHistorical !== undefined) params.isHistorical = isHistorical;

    const response = await this.get<RawSpanOtelPageResponse>(
      TRACES_ENDPOINTS.GET_BY_TRACE_ID,
      { params }
    );

    const spans = response.data?.Spans ?? [];
    return spans.map(span => this.transformOtelSpan(span));
  }

  /**
   * Gets specific spans by trace ID and span IDs.
   *
   * Accepts OTEL 16-char hex or GUID format for span IDs.
   *
   * @param traceId - Trace identifier
   * @param spanIds - List of span IDs to retrieve
   * @returns Promise resolving to an array of matching {@link SpanResponse}
   * @example
   * ```typescript
   * import { Traces } from '@uipath/uipath-typescript/traces';
   *
   * const traces = new Traces(sdk);
   *
   * // First retrieve all spans to find the IDs you want
   * const allSpans = await traces.getByTraceId('<traceId>');
   * const spanIds = allSpans.slice(0, 3).map(s => s.id);
   *
   * const subset = await traces.getByIds('<traceId>', spanIds);
   * ```
   */
  @track('Traces.GetByIds')
  async getByIds(traceId: string, spanIds: string[]): Promise<SpanResponse[]> {
    if (!traceId) throw new ValidationError({ message: 'traceId is required for getByIds' });

    const response = await this.post<RawSpanOtelResponse[]>(
      TRACES_ENDPOINTS.POST_BY_IDS(traceId),
      spanIds,
    );

    const spans = Array.isArray(response.data) ? response.data : [];
    return spans.map(span => this.transformOtelSpan(span));
  }

  private transformAgentSpan(raw: RawSpanAgentResponse): SpanResponse {
    return {
      id: raw.id,
      traceId: raw.traceId,
      parentId: raw.parentId,
      name: raw.name,
      startTime: raw.startTime,
      endTime: raw.endTime,
      attributes: raw.attributes,
      status: (Object.values(SpanStatus) as string[]).includes(raw.status)
        ? (raw.status as SpanStatus)
        : SpanStatus.Unset,
      source: raw.source != null && (Object.values(SpanSource) as string[]).includes(raw.source)
        ? (raw.source as SpanSource)
        : null,
      spanType: raw.spanType,
      verbosityLevel: raw.verbosityLevel != null && (Object.values(SpanVerbosityLevel) as string[]).includes(raw.verbosityLevel)
        ? (raw.verbosityLevel as SpanVerbosityLevel)
        : null,
      executionType: null,         // agent endpoint does not return this field
      folderKey: raw.folderKey,
      referenceId: raw.referenceId,
      referenceVersion: null,      // agent endpoint does not return this field
      agentVersion: raw.agentVersion,
      organizationId: raw.organizationId,
      tenantId: raw.tenantId,
      processKey: raw.processKey,
      jobKey: raw.jobKey,
      updatedAt: raw.updatedAt,
      expiryTimeUtc: raw.expiryTimeUtc,
      context: null,               // agent endpoint does not return this field
      attachments: null,           // agent endpoint does not return this field
      permissionStatus: null,      // agent endpoint does not return this field
    };
  }

  /**
   * Gets spans grouped by agent ID, with optional time range filtering and pagination.
   *
   * When no pagination options are provided, returns all matching results as {@link NonPaginatedResponse}.
   * When pagination options are provided, returns a {@link PaginatedResponse}.
   *
   * @param agentId - Agent identifier (GUID)
   * @param options - Optional filters and pagination {@link TracesGetByAgentIdOptions}
   * @returns Promise resolving to paginated or non-paginated {@link SpanResponse} collection
   * @example
   * ```typescript
   * import { Traces } from '@uipath/uipath-typescript/traces';
   *
   * const traces = new Traces(sdk);
   * const history = await traces.getByAgentId('<agentId>');
   * console.log(history.totalCount, history.items[0].startTime);
   * ```
   * @example
   * ```typescript
   * // Paginated with time filter
   * const page1 = await traces.getByAgentId('<agentId>', {
   *   pageSize: 10,
   *   startTime: '2026-01-01T00:00:00Z',
   *   endTime: '2026-02-01T00:00:00Z',
   * });
   * if (page1.hasNextPage) {
   *   const page2 = await traces.getByAgentId('<agentId>', { cursor: page1.nextCursor });
   * }
   * ```
   */
  @track('Traces.GetByAgentId')
  async getByAgentId<T extends TracesGetByAgentIdOptions = TracesGetByAgentIdOptions>(
    agentId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<SpanResponse>
      : NonPaginatedResponse<SpanResponse>
  > {
    if (!agentId) throw new ValidationError({ message: 'agentId is required for getByAgentId' });

    return PaginationHelpers.getAll<T, RawSpanAgentResponse, SpanResponse>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => TRACES_ENDPOINTS.GET_BY_AGENT_ID(agentId),
      transformFn: (raw) => this.transformAgentSpan(raw),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: TRACES_AGENT_PAGINATION.ITEMS_FIELD,
        totalCountField: TRACES_AGENT_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: TRACES_AGENT_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: TRACES_AGENT_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: TRACES_AGENT_OFFSET_PARAMS.COUNT_PARAM,
          convertToSkip: false,
        },
      },
      excludeFromPrefix: Object.keys(options ?? {}),
    }, options);
  }

  /**
   * Gets spans associated with a reference entity (agent, process, etc.), with pagination.
   *
   * When no pagination options are provided, returns all matching results as {@link NonPaginatedResponse}.
   * When pagination options are provided, returns a {@link PaginatedResponse}.
   *
   * @param referenceId - Reference entity identifier (GUID)
   * @param options - Optional filters and pagination {@link TracesGetByReferenceIdOptions}
   * @returns Promise resolving to paginated or non-paginated {@link SpanResponse} collection
   * @example
   * ```typescript
   * import { Traces } from '@uipath/uipath-typescript/traces';
   *
   * const traces = new Traces(sdk);
   * const spans = await traces.getByReferenceId('<referenceId>');
   * ```
   * @example
   * ```typescript
   * // Filter to a specific service type and version
   * const agentSpans = await traces.getByReferenceId('<referenceId>', {
   *   serviceType: 'agent',
   *   version: '1.0.0',
   * });
   * ```
   */
  @track('Traces.GetByReferenceId')
  async getByReferenceId<T extends TracesGetByReferenceIdOptions = TracesGetByReferenceIdOptions>(
    referenceId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<SpanResponse>
      : NonPaginatedResponse<SpanResponse>
  > {
    if (!referenceId) throw new ValidationError({ message: 'referenceId is required for getByReferenceId' });

    return PaginationHelpers.getAll<T, RawSpanAgentResponse, SpanResponse>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => TRACES_ENDPOINTS.GET_BY_REFERENCE_ID(referenceId),
      transformFn: (raw) => this.transformAgentSpan(raw),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: TRACES_AGENT_PAGINATION.ITEMS_FIELD,
        totalCountField: TRACES_AGENT_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: TRACES_AGENT_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: TRACES_AGENT_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: TRACES_AGENT_OFFSET_PARAMS.COUNT_PARAM,
          convertToSkip: false,
        },
      },
      excludeFromPrefix: Object.keys(options ?? {}),
    }, options);
  }
}
