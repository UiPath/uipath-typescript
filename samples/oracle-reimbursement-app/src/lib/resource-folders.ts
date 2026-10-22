/** Folder scope per backend resource, as authored. */
export interface ResourceFolder {
  kind: string;
  path?: string;
  /**
   * Orchestrator's own key for a process, which is NOT the name Apps shows — `TP_AllTypes`
   * may be started as `AA_AllTypes`, so starting one by its Apps name starts nothing.
   * Portable: the key is the same in any tenant that has the process.
   */
  processKey?: string;
  /** The numeric folder it was authored in. Tenant-specific; `path` is the portable form. */
  folderId?: number;
  /**
   * The bucket id the app was AUTHORED against. Provenance only — the runtime resolves a
   * bucket by name, because this number is per-tenant and does not survive an import.
   */
  resourceId?: string;
  authoredKey?: string;
  /**
   * The backend's own name for the resource when it differs from the key expressions use —
   * a bucket named `Invoice Archive` is `Invoice_Archive` in VB. Lookups by name send this.
   */
  name?: string;
}

export const RESOURCE_FOLDERS: Record<string, ResourceFolder> = {

};

/** The folder for a resource, preferring an explicit override. */
export function folderFor(
  resource: string,
  overrides: Record<string, string> = {},
): string | undefined {
  return overrides[resource] ?? RESOURCE_FOLDERS[resource]?.path;
}
