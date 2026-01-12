/**
 * Traces Service
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
import type { LlmOpsSpan, RawLlmOpsSpan, TracesServiceModel } from '@/models/conversational';

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
 * const conversation = await agent.conversations.create({
 *   agentReleaseId: 123,
 *   folderId: 456,
 *   traceId: 'my-trace-id'
 * });
 *
 * // Later, retrieve the trace spans
 * const spans = await agent.traces.getSpans('my-trace-id');
 *
 * // Analyze the spans
 * for (const span of spans) {
 *   console.log(`${span.Name}: ${span.Status}`);
 *   const attributes = JSON.parse(span.Attributes);
 *   console.log('Token usage:', attributes.tokenUsage);
 * }
 * ```
 */
export class Traces extends BaseService implements TracesServiceModel {
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
   * @returns Array of LLM Ops spans
   *
   * @example
   * ```typescript
   * const spans = await agent.traces.getSpans('550e8400-e29b-41d4-a716-446655440000');
   *
   * // Find spans with errors
   * const errorSpans = spans.filter(s => s.Status === LlmOpsSpanStatus.Error);
   *
   * // Calculate total duration
   * const rootSpan = spans.find(s => !s.ParentId);
   * if (rootSpan?.StartTime && rootSpan?.EndTime) {
   *   const duration = new Date(rootSpan.EndTime).getTime() - new Date(rootSpan.StartTime).getTime();
   *   console.log(`Total duration: ${duration}ms`);
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
