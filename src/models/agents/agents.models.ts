import type { AgentNamesGetAllOptions, AgentNamesGetAllResponse } from './agents.types';

/**
 * Service for retrieving runtime data for UiPath Agents.
 */
export interface AgentServiceModel {
  /**
   * Lists all distinct agent names on the given tenant.
   *
   * The tenant is inferred from the authenticated JWT. Optionally scope the
   * lookup to a list of folder keys.
   *
   * @param options - Optional folder-key scoping {@link AgentNamesGetAllOptions}
   * @returns Promise resolving to {@link AgentNamesGetAllResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // List all agent names on the tenant
   * const result = await agents.getNames();
   * console.log(result.agents);
   * ```
   * @example
   * ```typescript
   * // Scope to specific folders
   * const result = await agents.getNames({
   *   folderKeys: ['<folderKey1>', '<folderKey2>'],
   * });
   * ```
   */
  getNames(options?: AgentNamesGetAllOptions): Promise<AgentNamesGetAllResponse>;
}
