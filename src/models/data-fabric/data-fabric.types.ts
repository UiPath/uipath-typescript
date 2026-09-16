/**
 * Shared types for the Data Fabric domain — used by both Entities and ChoiceSets.
 * Lives here (not in either service's `*.types.ts`) to avoid cross-domain coupling
 * between sibling services.
 */

/**
 * Common shape for every folder-scoped Data Fabric operation.
 * Forwarded on the wire as `X-UIPATH-FolderKey` and/or `X-UiPath-FolderPath`.
 * The server resolves either to the same folder context. Both may be omitted for tenant-level entities.
 */
export interface EntityFolderScopedOptions {
  /**
   * Key identifying the folder the entity belongs to. Omit for tenant-level entities.
   *
   * @experimental Folder-scoped Data Fabric is in preview — the contract may change.
   */
  folderKey?: string;

  /**
   * Slash-delimited path of the folder the entity belongs to (e.g. `'Shared/Finance'`).
   * Prefer `folderKey` when known; the server resolves this path to a folder key at
   * request time. Requires the server-side FolderAuth flag; otherwise ignored (reads
   * fall through to tenant scope).
   *
   * @experimental Folder-scoped Data Fabric is in preview — the contract may change.
   */
  folderPath?: string;
}
