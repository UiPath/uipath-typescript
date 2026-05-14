import type { AgentNamesGetAllOptions, AgentNamesGetAllResponse } from './monitoring.types';

/**
 * Service for retrieving runtime monitoring data for UiPath Agents.
 *
 * Lists distinct agent names for a tenant, optionally scoped to specific folders.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { AgentMonitoring } from '@uipath/uipath-typescript/agent-monitoring';
 *
 * const agentMonitoring = new AgentMonitoring(sdk);
 * const result = await agentMonitoring.getNames('<tenantId>');
 * ```
 */
export interface AgentMonitoringServiceModel {
  /**
   * Lists all distinct agent names visible to the caller on the given tenant.
   *
   * Returns the full set of agent names that have run on the tenant, optionally
   * scoped to a list of folder keys.
   *
   * @param tenantId - Tenant identifier (GUID). Must match the JWT's tenant
   * @param options - Optional folder-key scoping {@link AgentNamesGetAllOptions}
   * @returns Promise resolving to {@link AgentNamesGetAllResponse}
   * @example
   * ```typescript
   * import { AgentMonitoring } from '@uipath/uipath-typescript/agent-monitoring';
   *
   * const agentMonitoring = new AgentMonitoring(sdk);
   *
   * // List all agent names on the tenant
   * const result = await agentMonitoring.getNames('<tenantId>');
   * console.log(result.agents);
   * ```
   * @example
   * ```typescript
   * // Scope to specific folders
   * const result = await agentMonitoring.getNames('<tenantId>', {
   *   folderKeys: ['<folderKey1>', '<folderKey2>'],
   * });
   * ```
   */
  getNames(tenantId: string, options?: AgentNamesGetAllOptions): Promise<AgentNamesGetAllResponse>;
}
