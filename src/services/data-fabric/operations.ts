import { UiPath } from '../../core/uipath';
import type { CodedFunctionContext } from '../../core/config/function-context';
import { EntityService } from './entities';
import type { EntityQueryRecordsOptions } from '../../models/data-fabric/entities.types';
import { ENTITY_NAME_PATTERN, type OperationHost } from './operations-runtime';

export * from './operations-runtime';

/**
 * The host an entity operation's runtime reads through, bound to the coded function's context.
 *
 * Pass it to {@link runMutation} or {@link runRead}: every `ctx.self` and `ctx.query` read the
 * handler makes goes through {@link EntityService.queryRecords} as the job's robot, in the folder
 * the operation was invoked in, so a same-named tenant-level entity is never picked up. The
 * handler never sees the context, the token or the SDK client.
 *
 * @param ctx - The execution context the coded-functions runtime hands the function.
 * @param entityName - The operation's own entity, which `ctx.self` reads.
 * @returns The host to run the operation's handler with.
 *
 * @example
 * ```typescript
 * import { entityOperationHost, runMutation } from '@uipath/uipath-typescript/entities';
 *
 * export default defineFunction({
 *   name: 'EscalateP3Tickets',
 *   handler: (input, ctx) => runMutation(handler, input, entityOperationHost(ctx, 'Ticket')),
 * });
 * ```
 */
export function entityOperationHost(ctx: CodedFunctionContext, entityName: string): OperationHost {
  // One client per invocation, built on its first read.
  let entities: EntityService | undefined;
  return {
    entity: entityName,
    read: async (name, options) => {
      // The SDK puts the name in the request path unencoded, so nothing but an entity name may reach it.
      if (typeof name !== 'string' || !ENTITY_NAME_PATTERN.test(name)) {
        throw new TypeError(`${JSON.stringify(name)} is not an entity name. Nothing was read.`);
      }
      entities ??= new EntityService(new UiPath(ctx));
      // `platform.folderKey` may be null; the options type takes string or undefined.
      const folderKey = ctx.platform?.folderKey ?? undefined;
      // The runtime's operators are the same strings the SDK's operator enum holds.
      const { items } = await entities.queryRecords({ name }, { ...options, folderKey } as EntityQueryRecordsOptions);
      return items as Record<string, unknown>[];
    },
  };
}
