/**
 * Orchestrator Assets Module
 *
 * Provides access to UiPath Orchestrator for asset management.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Assets } from '@uipath/uipath-typescript/assets';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const assetsService = new Assets(sdk);
 * const allAssets = await assetsService.getAll();
 * ```
 *
 * @module
 */

// Export service with cleaner name and keep AssetService for legacy UiPath class
export { AssetService as Assets, AssetService } from './assets';

// Re-export service-specific types
export type * from '../../../models/orchestrator/assets.types';
export type * from '../../../models/orchestrator/assets.models';
