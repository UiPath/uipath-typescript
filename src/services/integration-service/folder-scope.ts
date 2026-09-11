import { resolveFolderHeaders } from '../../utils/folder/folder-headers';
import { IntegrationServiceFolderContextOptions } from '../../models/integration-service/integration-service.types';

/**
 * Whether any folder context is present. Mirrors what `resolveFolderHeaders`
 * treats as resolvable, including its whitespace-only-is-missing rule.
 */
function hasFolderContext(
  { folderId, folderKey, folderPath }: IntegrationServiceFolderContextOptions,
  fallbackFolderKey?: string,
): boolean {
  return (
    folderId !== undefined ||
    !!folderKey?.trim() ||
    !!folderPath?.trim() ||
    !!fallbackFolderKey
  );
}

/**
 * Splits folder context out of an Integration Service options bag and resolves
 * it into folder headers, leaving the remaining fields as query params.
 *
 * Folder scoping is optional here — for Integration Service a folder narrows a
 * query rather than addressing the resource, and an unscoped call returns every
 * folder the caller can access. So a missing folder context yields no headers,
 * where the shared `resolveFolderHeaders` would throw. When the SDK was
 * initialized with a folder context (`uipath:folder-key` meta tag), that key is
 * used as the fallback.
 *
 * @param options - Caller-supplied options, including any folder context
 * @param resourceType - Label used in error messages (e.g. `'Connections.getAll'`)
 * @param fallbackFolderKey - Init-time folder key used when no folder context is supplied
 * @internal
 */
export function resolveFolderScope<T extends IntegrationServiceFolderContextOptions>(
  options: T,
  resourceType: string,
  fallbackFolderKey?: string,
): { headers: Record<string, string>; queryOptions: Omit<T, keyof IntegrationServiceFolderContextOptions> } {
  const { folderId, folderKey, folderPath, ...queryOptions } = options;

  // Guarded so `resolveFolderHeaders` is only called when it can resolve
  // something — it throws on an empty folder context, which is valid here.
  const headers = hasFolderContext({ folderId, folderKey, folderPath }, fallbackFolderKey)
    ? resolveFolderHeaders({ folderId, folderKey, folderPath, resourceType, fallbackFolderKey })
    : {};

  return { headers, queryOptions };
}
