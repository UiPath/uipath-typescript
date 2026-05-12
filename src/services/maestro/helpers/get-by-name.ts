import { NotFoundError, ValidationError } from '../../../core/errors';

/**
 * Resource labels recognised by the shared Maestro `getByName` helper.
 * Drives the prefix in `NotFoundError` messages, e.g.
 * `"MaestroProcess 'X' not found in folder 'Shared/Finance'."`.
 */
export enum MaestroResourceType {
  MaestroProcess = 'MaestroProcess',
  Case = 'Case',
}

/**
 * Options accepted by the shared Maestro `getByName` helper.
 */
export interface MaestroGetByNameOptions {
  /** Folder path that scopes the lookup. Matched against `folderName`. */
  folderPath?: string;
  /** Folder key (GUID) that scopes the lookup. */
  folderKey?: string;
  /**
   * Init-time folderKey from `BaseService.config.folderKey` (e.g. seeded by
   * the `uipath:folder-key` meta tag). Used only when the caller didn't supply
   * any folder context.
   */
  fallbackFolderKey?: string;
}

/**
 * Minimum shape required from a Maestro item for name-based lookup.
 * `getAll()` responses for both processes and cases already satisfy this.
 */
interface MaestroItemForLookup {
  name: string;
  folderName: string;
  folderKey: string;
}

/**
 * Shared client-side filter used by Maestro `getByName` implementations.
 *
 * Maestro's `/processes/summary` endpoint has no name-based lookup or filter
 * parameter, so callers must `getAll()` and filter client-side. This helper
 * standardises the matching rules across MaestroProcesses and Cases:
 *
 * - Name must match exactly (caller is responsible for trimming via
 *   `validateName` before invoking `getAll()` so input errors fail fast).
 * - `folderPath` matches against `folderName`.
 * - `folderKey` matches against `folderKey`.
 * - When the caller didn't supply any folder context, falls back to the
 *   init-time folderKey (e.g. from the `uipath:folder-key` meta tag).
 * - When neither explicit context nor the init-time fallback resolves, a
 *   `ValidationError` is thrown — mirroring the Orchestrator getByName
 *   contract (see `resolveFolderHeaders`).
 *
 * @param resourceType - Resource label used in error messages
 * @param items - Result of the caller's `getAll()`
 * @param validatedName - Pre-validated, trimmed resource name
 * @param options - Folder scoping + init-time fallback key
 * @throws ValidationError when no folder context can be resolved; NotFoundError when no item matches
 */
export function findMaestroResourceByName<T extends MaestroItemForLookup>(
  resourceType: MaestroResourceType,
  items: T[],
  validatedName: string,
  options: MaestroGetByNameOptions,
): T {
  const { folderPath, folderKey, fallbackFolderKey } = options;

  const trimmedKey = folderKey?.trim();
  const trimmedPath = folderPath?.trim();
  if (!trimmedKey && !trimmedPath && !fallbackFolderKey) {
    throw new ValidationError({
      message: `${resourceType}.getByName requires folder context: pass \`folderKey\` or \`folderPath\`, or initialize the SDK with a folder context.`,
    });
  }

  const effectiveFolderKey =
    trimmedKey ?? (trimmedPath ? undefined : fallbackFolderKey);

  const match = items.find(
    (item) =>
      item.name === validatedName &&
      (trimmedPath ? item.folderName === trimmedPath : true) &&
      (effectiveFolderKey ? item.folderKey === effectiveFolderKey : true),
  );

  if (!match) {
    throw new NotFoundError({
      message: `${resourceType} '${validatedName}' not found${describeFolderHint(trimmedPath, effectiveFolderKey)}.`,
    });
  }
  return match;
}

function describeFolderHint(folderPath: string | undefined, folderKey: string | undefined): string {
  const path = folderPath;
  if (path) return ` in folder '${path}'`;
  const key = folderKey?.trim();
  if (key) return ` in folder (key: ${key})`;
  return '';
}
