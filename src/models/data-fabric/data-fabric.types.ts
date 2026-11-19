/**
 * Shared types for the Data Fabric domain — used by both Entities and ChoiceSets.
 * Lives here (not in either service's `*.types.ts`) to avoid cross-domain coupling
 * between sibling services.
 */

/**
 * Common shape for every folder-scoped Data Fabric operation.
 * Forwarded on the wire as the `X-UIPATH-FolderKey` header.
 */
export interface EntityFolderScopedOptions {
  /**
   * Key identifying the folder the entity belongs to. Omit for tenant-level entities.
   *
   * @experimental Folder-scoped Data Fabric is in preview — the contract may change.
   */
  folderKey?: string;
}
