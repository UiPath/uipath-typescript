import { BaseService } from './base';
import { CollectionResponse, FolderScopedOptions } from '../models/common/types';
import { createHeaders } from '../utils/http/headers';
import { FOLDER_ID, FOLDER_PATH_ENCODED, FOLDER_KEY } from '../utils/constants/headers';
import { ODATA_PREFIX } from '../utils/constants/common';
import { addPrefixToKeys } from '../utils/transform';
import { NotFoundError, ValidationError } from '../core/errors';
import { validateGetByNameArgs } from '../utils/validation/name-validator';
import { encodeFolderPathHeader } from '../utils/encoding/folder-path';

/**
 * Matches single-quote characters in OData string literals — escaped to `''`
 * inside the `$filter=Name eq '…'` clause built by `getByNameLookup`.
 */
const SINGLE_QUOTE_RE = /'/g;

/**
 * Base service for services that need folder-specific functionality.
 *
 * Extends BaseService with additional methods for working with folder-scoped resources
 * in UiPath Orchestrator. Services that work with folders (Assets, Queues) extend this class.
 *
 * @remarks
 * This class provides helper methods for making folder-scoped API calls, handling folder IDs
 * in request headers, and managing cross-folder queries.
 */
export class FolderScopedService extends BaseService {
  /**
   * Gets resources in a folder with optional query parameters
   *
   * @param endpoint - API endpoint to call
   * @param folderId - required folder ID
   * @param options - Query options
   * @param transformFn - Optional function to transform the response data
   * @returns Promise resolving to an array of resources
   */
  protected async _getByFolder<T, R = T>(
    endpoint: string,
    folderId: number,
    options: Record<string, any> = {},
    transformFn?: (item: T) => R
  ): Promise<R[]> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });

    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, keysToPrefix);

    const response = await this.get<CollectionResponse<T>>(
      endpoint,
      {
        params: apiOptions,
        headers
      }
    );

    if (transformFn) {
      return response.data?.value.map(transformFn);
    }

    return response.data?.value as unknown as R[];
  }

  /**
   * Look up a single resource by name on a folder-scoped OData collection.
   *
   * Shared by `getByName` implementations across services (Assets, Processes, etc).
   * Handles:
   * - Input validation via `validateGetByNameArgs`
   * - Folder context resolution with init-time `config.folderKey` as fallback
   * - OData `$filter=Name eq '…'` with single-quote escaping + `$top=1`
   * - `X-UIPATH-FolderPath-Encoded` / `X-UIPATH-FolderKey` header construction
   * - Empty-result → `NotFoundError` with folder context in the message
   *
   * The transform step is caller-provided because each resource has its own
   * PascalCase → camelCase field mapping.
   *
   * @param resourceType - Resource label used in validation + error messages (e.g. 'Asset', 'Process')
   * @param endpoint - Folder-scoped OData collection endpoint
   * @param name - Resource name to search for
   * @param options - Folder scoping (`folderPath` / `folderKey`) + extra OData query options (`expand`, `select`, ...)
   * @param transform - Maps a raw OData item to the typed response (e.g. PascalCase → camelCase via field map)
   * @throws ValidationError when inputs are malformed; NotFoundError when no match
   */
  protected async getByNameLookup<TRaw extends object, T>(
    resourceType: string,
    endpoint: string,
    name: string,
    options: FolderScopedOptions,
    transform: (raw: TRaw) => T,
  ): Promise<T> {
    const { folderPath, folderKey, ...queryOptions } = options;
    const validated = validateGetByNameArgs(resourceType, name, folderPath, folderKey);

    // Fall back to the SDK's init-time folderKey (e.g. populated from the
    // `uipath:folder-key` meta tag in coded-app deployments) when the caller
    // didn't supply any folder context.
    const effectiveFolderKey =
      validated.folderKey ?? (validated.folderPath ? undefined : this.config.folderKey);

    // Folder context is mandatory: name lookups without one would either fail
    // server-side (folder-scoped endpoints) or silently return a match from
    // an unintended folder (across-folders endpoints). Reject early with a
    // uniform error.
    if (!validated.folderPath && !effectiveFolderKey) {
      throw new ValidationError({
        message: `${resourceType} lookup requires folder context: pass folderPath or folderKey, or initialize the SDK with a folder context.`,
      });
    }

    const headers = createHeaders({
      [FOLDER_PATH_ENCODED]: validated.folderPath ? encodeFolderPathHeader(validated.folderPath) : undefined,
      [FOLDER_KEY]: effectiveFolderKey,
    });

    const apiOptions = {
      ...addPrefixToKeys(queryOptions, ODATA_PREFIX, Object.keys(queryOptions)),
      '$filter': `Name eq '${validated.name.replace(SINGLE_QUOTE_RE, "''")}'`,
      '$top': '1',
    };

    const response = await this.get<CollectionResponse<TRaw>>(endpoint, {
      headers,
      params: apiOptions,
    });

    const items = response.data?.value;
    if (!items?.length) {
      const folderHint =
        validated.folderPath ? ` in folder '${validated.folderPath}'`
        : effectiveFolderKey ? ` in folder (key: ${effectiveFolderKey})`
        : '';
      throw new NotFoundError({
        message: `${resourceType} '${validated.name}' not found${folderHint}.`,
      });
    }

    return transform(items[0]);
  }
}
