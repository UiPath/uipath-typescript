/**
 * UiPath Core Module
 *
 * Provides authentication, configuration management, and the base UiPath client class.
 * Use this module when following the modular import pattern to create a configured SDK client instance.
 *
 * @example OAuth Authentication
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Entities } from '@uipath/uipath-typescript/entities';
 *
 * const sdk = new UiPath({
 *   baseUrl: 'https://cloud.uipath.com',
 *   orgName: 'myorg',
 *   tenantName: 'mytenant',
 *   clientId: 'your-client-id',
 *   redirectUri: 'http://localhost:3000/callback',
 *   scope: 'OR.Users OR.Robots'
 * });
 *
 * await sdk.initialize();
 *
 * const entitiesService = new Entities(sdk);
 * ```
 *
 * @example Secret-based Authentication
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Entities } from '@uipath/uipath-typescript/entities';
 *
 * const sdk = new UiPath({
 *   baseUrl: 'https://cloud.uipath.com',
 *   orgName: 'myorg',
 *   tenantName: 'mytenant',
 *   secret: 'your-api-secret',
 *   scope: 'OR.Users OR.Robots'
 * });
 *
 * // No need to call initialize() for secret-based auth
 * const entitiesService = new Entities(sdk);
 * ```
 *
 * @module
 */

export { UiPath } from './uipath';
export type { UiPathSDKConfig } from './config/sdk-config';
export type { TokenClaims, TokenIdentity } from './auth/types';
export * from './errors';

// Pagination (common across all services)
export * from '../utils/pagination';
