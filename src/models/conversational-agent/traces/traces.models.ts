import type { LlmOpsSpan } from './traces.types';

/**
 * Service for managing UiPath LLM Operations Traces
 *
 * Traces provide observability into LLM operations during conversational agent sessions.
 * Each conversation can have a traceId that links to spans representing
 * LLM calls, tool executions, and agent operations.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/)
 *
 * ```typescript
 * import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const conversationalAgentService = new ConversationalAgent(sdk);
 * const traceSpans = await conversationalAgentService.traces.getSpans(traceId);
 * ```
 */
export interface TraceServiceModel {
  /**
   * Get all spans for a given trace ID
   *
   * @param traceId - The trace ID to retrieve spans for
   * @returns Promise resolving to array of LLM Ops spans
   * {@link LlmOpsSpan}
   * @example
   * ```typescript
   * const traceSpans = await conversationalAgentService.traces.getSpans('550e8400-e29b-41d4-a716-446655440000');
   *
   * // Find spans with errors
   * const errorSpans = traceSpans.filter(span => span.Status === LlmOpsSpanStatus.Error);
   * ```
   */
  getSpans(traceId: string): Promise<LlmOpsSpan[]>;
}
