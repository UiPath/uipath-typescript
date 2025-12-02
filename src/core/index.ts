/**
 * UiPath Core Module
 *
 * Provides core SDK functionality including authentication and configuration.
 * Use this module to create UiPath instances for the modular pattern.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Entities } from '@uipath/uipath-typescript/entities';
 *
 * const uiPath = new UiPath({
 *   baseUrl: 'https://cloud.uipath.com',
 *   orgName: 'myorg',
 *   tenantName: 'mytenant',
 *   clientId: 'xxx',
 *   redirectUri: 'http://localhost:3000/callback'
 * });
 *
 * await uiPath.initialize();
 *
 * const entitiesService = new Entities(uiPath);
 * ```
 *
 * @module
 */

export { UiPath } from './uipath';
export type { UiPathSDKConfig } from './config/sdk-config';
export { UiPathError } from './errors';
export type { UiPathConfig } from './config/config';
