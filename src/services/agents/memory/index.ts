/**
 * Agent Memory Module
 *
 * Provides access to UiPath Agent Memory analytics.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { AgentMemory } from '@uipath/uipath-typescript/agent-memory';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const memory = new AgentMemory(sdk);
 * const timeline = await memory.getTimeline();
 * ```
 *
 * @module
 */

export { MemoryService as AgentMemory } from './memory';

export * from '../../../models/agents/memory';
