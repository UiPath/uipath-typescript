/**
 * TraceService
 *
 * Provides access to LLM Operations tracing data for conversational agent sessions.
 * This allows retrieving distributed trace spans for debugging, monitoring,
 * and observability purposes.
 */

// Core SDK imports
import type { IUiPathSDK } from '@/core/types';
import { track } from '@/core/telemetry';
import { BaseService } from '@/services/base';

// Models
import type { LlmOpsSpan, RawLlmOpsSpan, TraceServiceModel } from '@/models/conversational-agent';

// Utils
import { TRACES_ENDPOINTS } from '@/utils/constants/endpoints';

/**
 * Service for accessing LLM Operations traces
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
 * // Later, retrieve the trace spans
 * const traceSpans = await conversationalAgentService.traces.getSpans('my-trace-id');
 *
 * // Analyze the spans
 * for (const span of traceSpans) {
 *   console.log(`${span.Name}: ${span.Status}`);
 *   const spanAttributes = JSON.parse(span.Attributes);
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
   * @returns Promise resolving to an array of LLM Ops spans
   *
   * @example
   * ```typescript
   * const traceSpans = await conversationalAgentService.traces.getSpans('550e8400-e29b-41d4-a716-446655440000');
   *
   * // Find spans with errors
   * const errorSpans = traceSpans.filter(span => span.Status === LlmOpsSpanStatus.Error);
   *
   * // Calculate total duration
   * const rootSpan = traceSpans.find(span => !span.ParentId);
   * if (rootSpan?.StartTime && rootSpan?.EndTime) {
   *   const durationMs = new Date(rootSpan.EndTime).getTime() - new Date(rootSpan.StartTime).getTime();
   *   console.log(`Total duration: ${durationMs}ms`);
   * }
   * ```
   */
  @track('Traces.GetSpans')
  async getSpans(traceId: string): Promise<LlmOpsSpan[]> {
    const response = await this.get<RawLlmOpsSpan[]>(TRACES_ENDPOINTS.GET_SPANS(traceId));

    // Transform raw spans: stringify the Attributes object
    return response.data.map((rawSpan) => ({
      ...rawSpan,
      Attributes: JSON.stringify(rawSpan.Attributes)
    }));
  }
}
