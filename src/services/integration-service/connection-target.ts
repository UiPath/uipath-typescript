import { ValidationError } from '@/core/errors';
import type { ConnectionResource, ResolvedConnection } from '@/resources';
import { resolveConnection } from '@/utils/overrides/handles';
import type { IntegrationServiceFolderContextOptions } from '@/models/integration-service/integration-service.types';

/**
 * The connection a call targets for a plain id or a `resource.connection()` handle,
 * after the override published for that id is applied.
 *
 * @internal
 */
export function resolveConnectionTarget(connection: string | ConnectionResource, method: string): ResolvedConnection {
  const connectionId = typeof connection === 'string' ? connection : connection?.id;
  if (!connectionId) {
    throw new ValidationError({ message: `connectionId is required for ${method}` });
  }
  return resolveConnection(connectionId);
}

/**
 * Scopes `options` to the folder an override moved the connection to. The override's folder
 * replaces any folder the caller named, as ref resolution does for folder-scoped resources:
 * the remapped connection lives there, and Integration Service rejects it under any other
 * folder header.
 *
 * @internal
 */
export function withConnectionFolder<T extends IntegrationServiceFolderContextOptions>(
  options: T,
  target: ResolvedConnection,
): T {
  if (target.folderKey === undefined) return options;
  return { ...options, folderId: undefined, folderPath: undefined, folderKey: target.folderKey };
}
