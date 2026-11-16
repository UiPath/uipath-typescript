import type { FolderScopedOptions } from '@/models/common/types';
import type { FolderScopedResource, NamedResourceKind, ResolvedConnection } from '@/resources';
import { hasFolderOption } from '@/utils/folder/folder-headers';
import { resolveConnectionOverride } from './resolve-override';

/**
 * The folder a resource handle was declared in. Its override is published under that folder,
 * whatever folder a call is scoped to.
 *
 * @internal
 */
export interface OverrideScope {
  folderPath?: string;
}

/**
 * A `getByName` input split into the name, the options the call is scoped with and, for a
 * handle, the scope its override is looked up under.
 *
 * @internal
 */
export interface UnpackedHandle<T extends FolderScopedOptions> {
  name: string;
  options: T;
  /** Set for a handle only; a plain name's override is keyed by the call's own `folderPath`. */
  overrideScope?: OverrideScope;
}

/**
 * Splits a `getByName` input into the name and the options a lookup should use. A handle
 * contributes its `folderPath` only when the caller's options name no folder.
 *
 * @internal
 */
export function unpackFolderScopedHandle<T extends FolderScopedOptions>(
  nameOrHandle: string | FolderScopedResource<NamedResourceKind>,
  options: T,
): UnpackedHandle<T> {
  if (typeof nameOrHandle !== 'object' || nameOrHandle === null) return { name: nameOrHandle, options };
  const { name, folderPath } = nameOrHandle;
  return {
    name,
    options: folderPath !== undefined && !hasFolderOption(options) ? { ...options, folderPath } : options,
    overrideScope: { folderPath },
  };
}

/**
 * The connection a call targets for `connectionId`: the override published under
 * `connection.<connectionId>`, else the id as given.
 *
 * @internal
 */
export function resolveConnection(connectionId: string): ResolvedConnection {
  const override = resolveConnectionOverride(connectionId);
  return {
    id: override?.connectionId ?? connectionId,
    ...(override?.folderKey !== undefined && { folderKey: override.folderKey }),
  };
}
