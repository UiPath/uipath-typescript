/**
 * Entities Service Module
 *
 * Provides access to UiPath Data Fabric Entities service for managing entities and records.
 *
 * Entities are structured data tables in Data Fabric with typed fields, relationships, and operations.
 * They support CRUD operations, attachments, and integration with external data sources.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Entities } from '@uipath/uipath-typescript/entities';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const entities = new Entities(sdk);
 * const allEntities = await entities.getAll();
 * ```
 *
 * @module
 */

// Export service with cleaner name and keep EntityService for legacy UiPath class
export { EntityService as Entities, EntityService } from './entities';

// Re-export service-specific types
export type * from '../../../models/data-fabric/entities.types';
export type * from '../../../models/data-fabric/entities.models';
