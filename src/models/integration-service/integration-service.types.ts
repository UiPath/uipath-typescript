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
 * Folder context is optional — omit it to fall back to the folder context the
 * SDK was initialized with.
 */
export interface IntegrationServiceFolderContextOptions {
  /** Numeric folder ID. */
  folderId?: number;
  /** Folder key (GUID-formatted string). */
  folderKey?: string;
  /** Slash-delimited folder path, e.g. `'Shared/Finance'`. */
  folderPath?: string;
}
