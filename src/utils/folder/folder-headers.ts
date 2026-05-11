import { ValidationError } from '../../core/errors';
import { createHeaders } from '../http/headers';
import { FOLDER_ID, FOLDER_KEY, FOLDER_PATH_ENCODED } from '../constants/headers';
import { encodeFolderPathHeader } from '../encoding/folder-path';

export interface ResolveFolderHeadersInput {
  /** Numeric folder ID — sent as `X-UIPATH-OrganizationUnitId`. */
  folderId?: number;

  /** Folder key (GUID) — sent as `X-UIPATH-FolderKey`. */
  folderKey?: string;

  /**
   * Folder path (slash-delimited, e.g. `'Shared/Finance'`). Sent as
   * `X-UIPATH-FolderPath-Encoded` (encoded as base64-of-UTF-16-LE per the
   * Orchestrator contract).
   */
  folderPath?: string;

  /**
   * Resource label used in `ValidationError` messages (e.g. `'Asset.getByName'`,
   * `'processes.start'`). Helps callers locate the offending call site.
   */
  resourceType: string;

  /**
   * SDK init-time folder key (sourced from `<meta name="uipath:folder-key">`
   * in coded-app deployments). Used as a fallback when none of `folderId`,
   * `folderKey`, or `folderPath` is supplied.
   */
  fallbackFolderKey?: string;
}

/**
 * Resolves folder context into the appropriate Orchestrator folder headers.
 *
 * Centralized so all folder-scoped methods (e.g. `assets.getByName`,
 * `processes.getByName`, future Queues/Buckets/Jobs) share one implementation.
 *
 * Each input field maps directly to its header — no auto-detection or type
 * coercion. When multiple fields are supplied, all corresponding headers
 * are forwarded and the server resolves precedence.
 *
 * Routing:
 * - `folderId` → `X-UIPATH-OrganizationUnitId`
 * - `folderKey` → `X-UIPATH-FolderKey`
 * - `folderPath` → `X-UIPATH-FolderPath-Encoded`
 * - none set + `fallbackFolderKey` → fallback used as `X-UIPATH-FolderKey`
 * - none set + no fallback → `ValidationError`
 *
 * @throws ValidationError when no folder context can be resolved.
 */
export function resolveFolderHeaders(input: ResolveFolderHeadersInput): Record<string, string> {
  const { folderId, folderKey, folderPath, resourceType, fallbackFolderKey } = input;

  const trimmedKey = folderKey?.trim();
  const trimmedPath = folderPath?.trim();

  const headers: Record<string, string | number | undefined> = {};

  if (folderId !== undefined) {
    headers[FOLDER_ID] = folderId;
  }
  if (trimmedKey) {
    headers[FOLDER_KEY] = trimmedKey;
  }
  if (trimmedPath) {
    headers[FOLDER_PATH_ENCODED] = encodeFolderPathHeader(trimmedPath);
  }

  // No explicit folder context → meta-tag fallback or error.
  if (Object.keys(headers).length === 0) {
    if (!fallbackFolderKey) {
      throw new ValidationError({
        message: `${resourceType} requires folder context: pass \`folderId\`, \`folderKey\`, or \`folderPath\`, or initialize the SDK with a folder context.`,
      });
    }
    headers[FOLDER_KEY] = fallbackFolderKey;
  }

  return createHeaders(headers);
}
