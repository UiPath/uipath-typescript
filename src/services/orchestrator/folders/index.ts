/**
 * Folders Module
 *
 * Provides access to UiPath Orchestrator folder lookups, e.g. resolving a
 * folder's fully qualified path from its key.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Folders } from '@uipath/uipath-typescript/folders';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const folders = new Folders(sdk);
 * const folder = await folders.getByKey('<folderKey>');
 * ```
 *
 * @module
 */

export { FolderService as Folders, FolderService } from './folders';

export * from '../../../models/orchestrator/folders.types';
export * from '../../../models/orchestrator/folders.models';
