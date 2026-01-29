/**
 * TraceService
 *
 * Provides access to trace data for conversational agent sessions.
 * This allows retrieving distributed trace spans for debugging, monitoring,
 * and observability purposes.
 */

// Core SDK imports
import type { IUiPathSDK } from '@/core/types';
import { track } from '@/core/telemetry';
import { BaseService } from '@/services/base';

// Models
import type {
  TraceSpanGetResponse,
  TraceServiceModel
} from '@/models/conversational-agent';

// Internal types
import type { RawTraceSpan } from '@/models/conversational-agent/traces/traces.internal-types';

// Utils
import { TRACES_ENDPOINTS } from '@/utils/constants/endpoints';
import { pascalToCamelCaseKeys } from '@/utils/transform';

/**
 * Service for accessing trace spans
 *
 * Traces provide observability into LLM operations during conversational agent sessions.
 * Each conversation can have a traceId that links to spans representing:
 * - LLM calls (prompts, completions, token usage)
 * - Tool executions
 * - Agent operations
 *
 * @example
 * ```typescript
 * // Create a conversation with a trace ID
 * const newConversation = await conversationalAgentService.conversations.create({
 *   agentReleaseId: 123,
 *   folderId: 456,
 *   traceId: 'my-trace-id'
 * });
 *
 * // Later, retrieve the spans
 * const spans = await conversationalAgentService.traces.getSpans('my-trace-id');
 *
 * // Analyze the spans
 * for (const span of spans) {
 *   console.log(`${span.name}: ${span.status}`);
 *   const spanAttributes = JSON.parse(span.attributes);
 *   console.log('Token usage:', spanAttributes.tokenUsage);
 * }
 * ```
 */
export class TraceService extends BaseService implements TraceServiceModel {
  /**
   * Creates an instance of the Traces service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   */
  constructor(instance: IUiPathSDK) {
    super(instance);
  }

  /**
   * Get all spans for a given trace ID
   *
   * Retrieves the distributed trace spans associated with a conversation trace.
   * Each span represents an operation (LLM call, tool execution, etc.) and
   * contains timing, status, and attribute information.
   *
   * @param traceId - The trace ID to retrieve spans for
   * @returns Promise resolving to an array of trace spans
   *
   * @example
   * ```typescript
   * const spans = await conversationalAgentService.traces.getSpans(traceId);
   *
   * // Find spans with errors
   * const errorSpans = spans.filter(span => span.status === TraceSpanStatus.Error);
   *
   * // Calculate total duration
   * const rootSpan = spans.find(span => !span.parentId);
   * if (rootSpan?.startTime && rootSpan?.endTime) {
   *   const durationMs = new Date(rootSpan.endTime).getTime() - new Date(rootSpan.startTime).getTime();
   *   console.log(`Total duration: ${durationMs}ms`);
   * }
   * ```
   */
  @track('ConversationalAgent.Traces.GetSpans')
  async getSpans(traceId: string): Promise<TraceSpanGetResponse[]> {
    const response = await this.get<RawTraceSpan[]>(TRACES_ENDPOINTS.GET_SPANS(traceId));

    // Transform raw spans: convert PascalCase to camelCase and stringify Attributes
    return response.data.map((rawSpan) => {
      const transformedSpan = pascalToCamelCaseKeys(rawSpan) as TraceSpanGetResponse;
      // Stringify the attributes object (it comes as an object from API)
      transformedSpan.attributes = JSON.stringify(rawSpan.Attributes);
      return transformedSpan;
    });
  }
}
