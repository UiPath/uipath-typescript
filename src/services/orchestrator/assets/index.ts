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
 * const assets = new Assets(sdk);
 * const allAssets = await assets.getAll();
 * ```
 *
 * @module
 */

export { AssetService as Assets, AssetService } from './assets';

export * from '../../../models/orchestrator/assets.types';
export * from '../../../models/orchestrator/assets.models';
