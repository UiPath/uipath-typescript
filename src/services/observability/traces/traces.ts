import { BaseService } from '../../base';
import {
  SpanResponse,
  SpanStatus,
  SpanAttachmentProvider,
  SpanAttachmentDirection,
  TracesGetByIdOptions,
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
} from '../../../models/observability/traces/traces.internal-types';
import { TRACES_ENDPOINTS } from '../../../utils/constants/endpoints';
import type { QueryParams } from '../../../models/common/request-spec';
import { track } from '../../../core/telemetry';
import { ValidationError } from '../../../core/errors';
import { pascalToCamelCaseKeys } from '../../../utils/transform';

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

}
