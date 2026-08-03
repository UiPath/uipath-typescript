/**
 * Data Fabric Entity v3 Service Module
 *
 * Provides access to the UiPath Data Fabric Entity **v3** API, which adds
 * composite-entity support (entities backed by multiple related "member" tables)
 * on top of the v1/v2 surface.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { EntitiesV3 } from '@uipath/uipath-typescript/entities-v3';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const entitiesV3 = new EntitiesV3(sdk);
 * const entities = await entitiesV3.getAll();
 * ```
 *
 * @module
 */

// Export service with a cleaner plural alias, plus the class name.
export { EntityV3Service as EntitiesV3, EntityV3Service } from '../entities-v3';

// v3-specific types and models
export * from '../../../models/data-fabric/entities-v3.types';
export * from '../../../models/data-fabric/entities-v3.models';

// Shared Data Fabric query/field types referenced by v3 options (re-exported for convenience)
export {
  LogicalOperator,
  QueryFilterOperator,
  EntityFieldDataType,
  EntityAggregateFunction,
  JoinType,
} from '../../../models/data-fabric/entities.types';
export type {
  EntityQueryFilter,
  EntityQueryFilterGroup,
  EntityQuerySortOption,
  EntityAggregate,
  EntityJoin,
  SqlType,
  EntityFileType,
} from '../../../models/data-fabric/entities.types';
