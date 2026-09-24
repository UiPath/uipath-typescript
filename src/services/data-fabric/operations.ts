import { UiPath } from '../../core/uipath';
import type { CodedFunctionContext } from '../../core/config/function-context';
import { EntityService } from './entities';
import type { EntityQueryRecordsOptions, EntityRecord } from '../../models/data-fabric/entities.types';

/**
 * Reads the records of one Data Fabric entity from inside a coded function.
 *
 * This is the read primitive of an entity operation: the function receives its
 * execution context, names the entity, and gets rows back. The SDK client is
 * built from the context, so the author never handles configuration or tokens,
 * and the read is scoped to the folder the function runs in unless the options
 * name another one. A shared tenant may hold a tenant-level entity with the same
 * name; scoping by default keeps the operation on its own data.
 *
 * @param ctx - The execution context the coded-functions runtime hands the function.
 * @param entityName - Name of the entity to read.
 * @param options - Filters, sorting, paging and field selection, as accepted by
 *   {@link EntityService.queryRecords}; `folderKey` overrides the invocation folder.
 * @returns The matching records.
 *
 * @example
 * ```typescript
 * import { query } from '@uipath/uipath-typescript/entity-operations';
 * import { QueryFilterOperator } from '@uipath/uipath-typescript/entities';
 *
 * const overdue = await query(ctx, 'Ticket', {
 *   filterGroup: {
 *     queryFilters: [{ fieldName: 'Priority', operator: QueryFilterOperator.Equals, value: 'P3' }],
 *   },
 * });
 * ```
 */
export async function query(
  ctx: CodedFunctionContext,
  entityName: string,
  options?: EntityQueryRecordsOptions,
): Promise<EntityRecord[]> {
  const entities = new EntityService(new UiPath(ctx));
  const folderKey = options?.folderKey ?? ctx.platform?.folderKey ?? undefined;
  const { items } = await entities.queryRecords({ name: entityName }, { ...options, folderKey });
  return items;
}
