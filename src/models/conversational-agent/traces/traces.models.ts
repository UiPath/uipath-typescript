import type { TraceSpanGetResponse } from './traces.types';

/**
 * Service for managing UiPath Trace Spans
 *
 * A **trace** represents the complete execution path of a conversation, identified by a unique traceId.
 * A **span** represents a single operation within that trace (e.g., an LLM call, tool execution, or agent action).
 * Together, traces and spans provide observability into conversational agent sessions, allowing you to
 * analyze performance, debug issues, and understand the flow of operations.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/)
 *
 * ```typescript
 * import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const conversationalAgentService = new ConversationalAgent(sdk);
 * const spans = await conversationalAgentService.traces.getSpans(traceId);
 * ```
 */
export interface TraceServiceModel {
  /**
   * Get all spans for a given trace ID
   *
   * @param traceId - The trace ID to retrieve spans for
   * @returns Promise resolving to array of spans
   * {@link TraceSpanGetResponse}
   * @example
   * ```typescript
   * const spans = await conversationalAgentService.traces.getSpans(traceId);
   *
   * // Find spans with errors
   * const errorSpans = spans.filter(span => span.status === TraceSpanStatus.Error);
   * ```
   */
  getSpans(traceId: string): Promise<TraceSpanGetResponse[]>;
}
