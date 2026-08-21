/**
 * Business Apps Module
 *
 * @experimental
 *
 * /// warning
 * Preview: This module is experimental and may change or be removed in future releases.
 * ///
 *
 * Provides access to Maestro business app definitions:
 * - `BusinessApps` — create, read, update and delete the tenant's business apps
 *
 * A business app is the tenant-level definition behind a workspace in Maestro — its name,
 * description, icon, color, and the Orchestrator processes it surfaces. Definitions are
 * tenant-scoped, so no folder is involved.
 *
 * Requires the `PIMS` scope, plus the tenant-level `APPS.View` permission to read and
 * `APPS.Create` / `APPS.Edit` to write.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { BusinessApps } from '@uipath/uipath-typescript/business-apps';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const businessApps = new BusinessApps(sdk);
 *
 * const app = await businessApps.create('Claims Intake', ['<processKey>'], {
 *   description: 'Handles inbound claims',
 * });
 *
 * const all = await businessApps.getAll();
 *
 * await app.delete();
 * ```
 *
 * @module
 */

export { BusinessAppsService as BusinessApps } from './business-apps';

// Models (types, response shapes)
export * from '../../../models/maestro/business-apps.types';
export * from '../../../models/maestro/business-apps.models';
