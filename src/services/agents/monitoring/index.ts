/**
 * Agent Monitoring Module
 *
 * Provides access to runtime monitoring data for UiPath Agents — agent name discovery.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { AgentMonitoring } from '@uipath/uipath-typescript/agent-monitoring';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const agentMonitoring = new AgentMonitoring(sdk);
 * const result = await agentMonitoring.getNames('<tenantId>');
 * ```
 *
 * @module
 */

export { AgentMonitoringService as AgentMonitoring } from './monitoring';

export * from '../../../models/agents/monitoring';
