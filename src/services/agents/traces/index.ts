/**
 * Agent Traces Module
 *
 * Provides access to UiPath Agent trace-level analytics — error/latency/unit
 * consumption timelines and span lookups.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { AgentTraces } from '@uipath/uipath-typescript/agent-traces';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const trace = new AgentTraces(sdk);
 * const timeline = await trace.getErrorsTimeline();
 * ```
 *
 * @module
 */

export { AgentTracesService as AgentTraces } from './traces';

export * from '../../../models/agents/traces';
