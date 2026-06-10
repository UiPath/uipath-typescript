/**
 * Agents Module
 *
 * Provides access to UiPath Agents runtime data — agent list, consumption,
 * and health metrics.
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
 * const result = await agents.getAll(new Date('2025-05-01T00:00:00Z'), new Date('2026-05-14T00:00:00Z'));
 * ```
 *
 * @module
 */

export { AgentService as Agents } from './agents';

export * from '../../models/agents/agents.types';
export * from '../../models/agents/agents.models';
