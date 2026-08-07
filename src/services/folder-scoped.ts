import { BaseService } from './base';
import { CollectionResponse, FolderScopedOptions } from '../models/common/types';
import { createHeaders } from '../utils/http/headers';
import { FOLDER_ID } from '../utils/constants/headers';
import { ODATA_PREFIX } from '../utils/constants/common';
import { addPrefixToKeys, transformOptions, FieldMapping } from '../utils/transform';
import { NotFoundError } from '../core/errors';
import { validateName } from '../utils/validation/name-validator';
import { resolveFolderHeaders } from '../utils/folder/folder-headers';

/**
 * Matches single-quote characters in OData string literals — escaped to `''`
 * inside the `$filter=Name eq '…'` clause built by the shared name-lookup
 * helper.
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
   * - Name validation via `validateName`
   * - Folder header resolution via `resolveFolderHeaders` (folderId → ID/key
   *   header by type, folderPath → encoded path header, falls back to
   *   init-time `config.folderKey` from the `uipath:folder-key` meta tag)
   * - OData `$filter=Name eq '…'` with single-quote escaping + `$top=1`
   * - Empty-result → `NotFoundError` with folder context in the message
   *
   * The transform step is caller-provided because each resource has its own
   * PascalCase → camelCase field mapping.
   *
   * @param resourceType - Resource label used in validation + error messages (e.g. 'Asset', 'Process')
   * @param endpoint - Folder-scoped OData collection endpoint
   * @param name - Resource name to search for
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) + OData query options (`expand`, `select`)
   * @param transform - Maps a raw OData item to the typed response (e.g. PascalCase → camelCase via field map)
   * @param responseFieldMap - Optional response field map (API → SDK), reversed internally by
   *   `transformOptions` to rewrite SDK field names back to API names in user-supplied
   *   `expand` / `select` (symmetric counterpart to `transform`)
   * @throws ValidationError when inputs are malformed; NotFoundError when no match
   */
  protected async getByNameLookup<TRaw extends object, T>(
    resourceType: string,
    endpoint: string,
    name: string,
    options: FolderScopedOptions,
    transform: (raw: TRaw) => T,
    responseFieldMap?: FieldMapping,
  ): Promise<T> {
    const { folderId, folderKey, folderPath, ...queryOptions } = options;

    const apiFieldOptions = responseFieldMap
      ? transformOptions(queryOptions, responseFieldMap)
      : queryOptions;
    const extraParams = addPrefixToKeys(apiFieldOptions, ODATA_PREFIX, Object.keys(apiFieldOptions));

    return this.findByNameInFolder<TRaw, T>({
      resourceType,
      endpoint,
      name,
      folder: { folderId, folderKey, folderPath },
      callerLabel: `${resourceType}.getByName`,
      fallbackFolderKey: this.config.folderKey,
      extraParams,
      mapItem: transform,
    });
  }

  /**
   * Resolves a resource's numeric `Id` from its `Name` within a folder scope.
   *
   * Used by service methods that accept `<resource>: number | string` as their
   * first argument. When the caller passes a string, the method calls this
   * helper to obtain the numeric ID before continuing with the existing
   * ID-based flow.
   *
   * Issues a lean OData request that projects only `Id` (`$select=Id&$top=1`),
   * so the response is small and no field-rename transform is required.
   *
   * @param resourceType - Resource label used in validation + error messages (e.g. 'Bucket', 'Asset')
   * @param endpoint - Folder-scoped OData collection endpoint
   * @param name - Resource name to resolve
   * @param folder - Folder scoping (`folderId` / `folderKey` / `folderPath`); at least one required unless SDK init-time `folderKey` is set
   * @param callerLabel - Label used in header resolution (e.g. 'Buckets.deleteFile') for error context
   * @throws ValidationError when the name is empty or the folder scope is unresolvable
   * @throws NotFoundError when the OData response contains no matching resource
   */
  protected async resolveIdByName(
    resourceType: string,
    endpoint: string,
    name: string,
    folder: { folderId?: number; folderKey?: string; folderPath?: string },
    callerLabel: string,
  ): Promise<number> {
    return this.findByNameInFolder<{ Id: number }, number>({
      resourceType,
      endpoint,
      name,
      folder,
      callerLabel,
      fallbackFolderKey: this.config.folderKey,
      extraParams: { '$select': 'Id' },
      mapItem: (raw) => raw.Id,
    });
  }

  /**
   * Core name-lookup building block: validates the name, resolves folder
   * headers, issues the `$filter=Name eq '…'&$top=1` OData query, maps the
   * single result, and throws `NotFoundError` when the response is empty.
   *
   * Not exposed to services directly — callers go through `getByNameLookup`
   * (full-resource fetch) or `resolveIdByName` (Id-only projection). Both
   * differ only in `extraParams` (`$select`) and `mapItem`.
   */
  private async findByNameInFolder<TRaw extends object, TOut>(args: {
    resourceType: string;
    endpoint: string;
    name: string;
    folder: { folderId?: number; folderKey?: string; folderPath?: string };
    callerLabel: string;
    fallbackFolderKey?: string;
    extraParams?: Record<string, string>;
    mapItem: (raw: TRaw) => TOut;
  }): Promise<TOut> {
    const validatedName = validateName(args.resourceType, args.name);

    const headers = resolveFolderHeaders({
      folderId: args.folder.folderId,
      folderKey: args.folder.folderKey,
      folderPath: args.folder.folderPath,
      resourceType: args.callerLabel,
      fallbackFolderKey: args.fallbackFolderKey,
    });

    const params = {
      ...args.extraParams,
      '$filter': `Name eq '${validatedName.replace(SINGLE_QUOTE_RE, "''")}'`,
      '$top': '1',
    };

    const response = await this.get<CollectionResponse<TRaw>>(args.endpoint, {
      headers,
      params,
    });

    const items = response.data?.value;
    if (!items?.length) {
      const folderHint = describeFolderForError(args.folder.folderId, args.folder.folderKey, args.folder.folderPath);
      throw new NotFoundError({
        message: `${args.resourceType} '${validatedName}' not found${folderHint}.`,
      });
    }

    return args.mapItem(items[0]);
  }
}

/** Renders the supplied folder for a NotFoundError message. */
function describeFolderForError(
  folderId: number | undefined,
  folderKey: string | undefined,
  folderPath: string | undefined,
): string {
  const path = folderPath?.trim();
  if (path) return ` in folder '${path}'`;
  const key = folderKey?.trim();
  if (key) return ` in folder (key: ${key})`;
  if (typeof folderId === 'number') return ` in folder (id: ${folderId})`;
  return '';
}
