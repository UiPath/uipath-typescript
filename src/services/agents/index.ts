/**
 * Agents Module
 *
 * Provides access to UiPath Agents runtime data — agent name discovery.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Agents } from '@uipath/uipath-typescript/agents';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const agents = new Agents(sdk);
 * const result = await agents.getNames();
 * ```
 *
 * @module
 */

export { AgentService as Agents } from './agents';

export * from '../../models/agents/agents.types';
export * from '../../models/agents/agents.models';
