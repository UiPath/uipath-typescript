/**
 * Memory Module
 *
 * Provides access to UiPath Agent Memory analytics.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Memory } from '@uipath/uipath-typescript/memory';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const memory = new Memory(sdk);
 * const timeline = await memory.getTimeline();
 * ```
 *
 * @module
 */

export { MemoryService as Memory } from './memory';

export * from '../../../models/agents/memory';
