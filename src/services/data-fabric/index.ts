/**
 * Data Fabric Services Module
 *
 * Provides access to UiPath Data Fabric services for entity management.
 * @module
 */

// Export service with cleaner name and keep EntityService for legacy UiPath class
export { EntityService as Entities, EntityService } from './entities';

// Re-export types for convenience
export type * from '../../models/data-fabric/entities.types';
export type * from '../../models/data-fabric/entities.models';

// Re-export common utilities users might need
export { UiPathError } from '../../core/errors';
export type { PaginatedResponse, NonPaginatedResponse } from '../../utils/pagination';

// Re-export UiPathClient for modular pattern
export { UiPathClient } from '../../core/client';
export type { UiPathSDKConfig } from '../../core/config/sdk-config';
