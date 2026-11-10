import { ValidationError } from '@/core/errors';
import { resolveConnection, type ConnectionResource, type ResolvedConnection } from '@/resources';
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
 * Scopes `options` to the folder an override moved the connection to, since Integration
 * Service rejects a connection outside the folder header. A folder the caller names wins.
 *
 * @internal
 */
export function withConnectionFolder<T extends IntegrationServiceFolderContextOptions>(
  options: T,
  target: ResolvedConnection,
): T {
  const hasExplicitFolder =
    options.folderId !== undefined || options.folderKey !== undefined || options.folderPath !== undefined;
  if (target.folderKey === undefined || hasExplicitFolder) return options;
  return { ...options, folderKey: target.folderKey };
}
