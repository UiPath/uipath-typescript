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
 * const uiPath = new UiPath(config);
 * await uiPath.initialize();
 *
 * const assetsService = new Assets(uiPath);
 * const allAssets = await assetsService.getAll();
 * ```
 *
 * @module
 */

// Export service with cleaner name and keep AssetService for legacy UiPath class
export { AssetService as Assets, AssetService } from './assets';

// Re-export types for convenience
export type * from '../../../models/orchestrator/assets.types';
export type * from '../../../models/orchestrator/assets.models';

// Re-export common utilities users might need
export { UiPathError } from '../../../core/errors';
export type { PaginatedResponse, NonPaginatedResponse } from '../../../utils/pagination';
export type { UiPathSDKConfig } from '../../../core/config/sdk-config';
export type { UiPath } from '../../../core/uipath';
