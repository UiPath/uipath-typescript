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

/**
 * Folder of an entity's binding, for a public coded app.
 */
export interface EntityPublicAppOptions {
  /**
   * Public coded apps only: the folder path the entity's binding was declared with, so the binding key is
   * `name.folderPath` as in `bindings_v2.json`. Omit for a binding without a folder. Ignored outside public mode.
   */
  folderPath?: string;
}
