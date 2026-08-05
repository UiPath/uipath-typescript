/**
 * Shared types for the Integration Service domain — used by Connections,
 * Connectors, and the Execution passthrough. Lives here (not in a single
 * service's `*.types.ts`) to avoid cross-service coupling between siblings.
 */

/**
 * Folder context accepted by folder-scoped Integration Service methods.
 * Provide one of `folderId`, `folderKey`, or `folderPath`. When more than one
 * is supplied, all are forwarded; the server applies precedence
 * `folderPath` > `folderKey` > `folderId`.
 *
 * Declared here rather than reusing the Orchestrator-facing `FolderScopedOptions`
 * because Integration Service endpoints take no OData `expand` / `select`.
 */
export interface IntegrationServiceFolderContextOptions {
  /** Numeric folder ID. */
  folderId?: number;
  /** Folder key (GUID-formatted string). */
  folderKey?: string;
  /** Slash-delimited folder path, e.g. `'Shared/Finance'`. */
  folderPath?: string;
}

/**
 * Folder scoping shared by every connection-yielding Integration Service
 * method. Folder context is optional — omit it to search every folder the
 * caller can access, or initialize the SDK with a folder context to have it
 * applied automatically.
 */
export interface IntegrationServiceFolderScopedOptions extends IntegrationServiceFolderContextOptions {
  /** Include resources from all folders the caller has access to. */
  allFolders?: boolean;
}
