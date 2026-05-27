import { BaseService } from '../../base';
import {
  SpanResponse,
  SpanStatus,
  SpanSource,
  SpanVerbosityLevel,
  SpanAttachmentProvider,
  SpanAttachmentDirection,
  TracesGetByIdOptions,
  TracesGetByAgentIdOptions,
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
import { pascalToCamelCaseKeys } from '../../../utils/transform';

const VALID_SPAN_STATUSES = new Set<string>(Object.values(SpanStatus));
const VALID_SPAN_SOURCES = new Set<string>(Object.values(SpanSource));
const VALID_SPAN_VERBOSITY_LEVELS = new Set<string>(Object.values(SpanVerbosityLevel));

export class TracesService extends BaseService implements TracesServiceModel {

  private transformOtelSpan(raw: RawSpanOtelResponse): SpanResponse {
    const { Attributes, ...rest } = raw;
    const camel = pascalToCamelCaseKeys(rest) as SpanResponse;
    return {
      ...camel,
      // Attributes keys are user-defined schema columns — must not be camelCased
      attributes: Attributes,
      // Integer enum fields require explicit mapping after camelCasing
      status: SpanStatusMap[raw.Status] ?? SpanStatus.Unset,
      source: raw.Source != null ? (SpanSourceMap[raw.Source] ?? null) : null,
      verbosityLevel: raw.VerbosityLevel != null ? (SpanVerbosityLevelMap[raw.VerbosityLevel] ?? null) : null,
      executionType: raw.ExecutionType != null ? (SpanExecutionTypeMap[raw.ExecutionType] ?? null) : null,
      permissionStatus: raw.PermissionStatus != null ? (SpanPermissionStatusMap[raw.PermissionStatus] ?? null) : null,
      attachments: raw.Attachments
        ? raw.Attachments.map(a => ({
            provider: SpanAttachmentProviderMap[a.Provider] ?? SpanAttachmentProvider.Orchestrator,
            id: a.Id,
            fileName: a.FileName,
            mimeType: a.MimeType,
            direction: SpanAttachmentDirectionMap[a.Direction] ?? SpanAttachmentDirection.None,
          }))
        : null,
    };
  }

  /**
   * Gets all spans for a specific trace ID.
   *
   * Returns up to `pageSize` spans (default 1000) in a single fetch.
   * Accepts both GUID format and OTEL 32-char hex format — the API normalizes both.
   *
   * @param traceId - Trace identifier
   * @param options - Optional filters {@link TracesGetByIdOptions}
   * @returns Promise resolving to an array of {@link SpanResponse}
   * @example
   * ```typescript
   * import { Traces } from '@uipath/uipath-typescript/traces';
   *
   * const traces = new Traces(sdk);
   * const spans = await traces.getById('<traceId>');
   * console.log(spans.length, spans[0].spanType, spans[0].status);
   * ```
   * @example
   * ```typescript
   * // Filter to a specific agent's spans
   * const agentSpans = await traces.getById('<traceId>', {
   *   agentId: '<agentId>',
   *   pageSize: 500,
   * });
   * ```
   */
  @track('Traces.GetById')
  async getById(traceId: string, options?: TracesGetByIdOptions): Promise<SpanResponse[]> {
    if (!traceId) throw new ValidationError({ message: 'traceId is required for getById' });

    const { pageSize = 1000, agentId, includeExpiredSpans } = options ?? {};
    const params: QueryParams = { traceId, pageSize };
    if (agentId !== undefined) params.agentId = agentId;
    if (includeExpiredSpans !== undefined) params.isHistorical = includeExpiredSpans;

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
   * const allSpans = await traces.getById('<traceId>');
   * const spanIds = allSpans.slice(0, 3).map(s => s.id);
   *
   * const subset = await traces.getSpansByIds('<traceId>', spanIds);
   * ```
   */
  @track('Traces.GetSpansByIds')
  async getSpansByIds(traceId: string, spanIds: string[]): Promise<SpanResponse[]> {
    if (!traceId) throw new ValidationError({ message: 'traceId is required for getSpansByIds' });

    const response = await this.post<RawSpanOtelResponse[]>(
      TRACES_ENDPOINTS.POST_BY_IDS,
      spanIds,
      { params: { traceId } },
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
      status: VALID_SPAN_STATUSES.has(raw.status)
        ? (raw.status as SpanStatus)
        : SpanStatus.Unset,
      source: raw.source != null && VALID_SPAN_SOURCES.has(raw.source)
        ? (raw.source as SpanSource)
        : null,
      spanType: raw.spanType,
      verbosityLevel: raw.verbosityLevel != null && VALID_SPAN_VERBOSITY_LEVELS.has(raw.verbosityLevel)
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
   * const history = await traces.getSpansByAgentId('<agentId>');
   * console.log(history.totalCount, history.items[0].startTime);
   * ```
   * @example
   * ```typescript
   * // Paginated with time filter
   * const page1 = await traces.getSpansByAgentId('<agentId>', {
   *   pageSize: 10,
   *   startTime: '2026-01-01T00:00:00Z',
   *   endTime: '2026-02-01T00:00:00Z',
   * });
   * if (page1.hasNextPage) {
   *   const page2 = await traces.getSpansByAgentId('<agentId>', { cursor: page1.nextCursor });
   * }
   * ```
   */
  @track('Traces.GetSpansByAgentId')
  async getSpansByAgentId<T extends TracesGetByAgentIdOptions = TracesGetByAgentIdOptions>(
    agentId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<SpanResponse>
      : NonPaginatedResponse<SpanResponse>
  > {
    if (!agentId) throw new ValidationError({ message: 'agentId is required for getSpansByAgentId' });

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

}
