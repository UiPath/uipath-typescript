import { FolderScopedService } from '../../folder-scoped';
import {
  FunctionGetAllOptions,
  FunctionHttpMethod,
  FunctionInvokeOptions,
  FunctionRef,
  RawFunctionGetResponse,
} from '../../../models/orchestrator/functions.types';
import {
  FunctionAcquireLicenseOptions,
  LicenseCacheEntry,
  RawFolderResponse,
  RawFunctionTrigger,
  RawStudioWebLicenseResponse,
  StudioWebLicense,
  StudioWebLicenseTokenClaims,
} from '../../../models/orchestrator/functions.internal-types';
import { CollectionResponse, FolderScopedOptions } from '../../../models/common/types';
import { UiPathError } from '../../../core/errors/base';
import { NotFoundError } from '../../../core/errors/not-found';
import { isNotFoundError } from '../../../core/errors/guards';
import {
  FunctionServiceModel,
  FunctionGetResponse,
  createFunctionWithMethods,
} from '../../../models/orchestrator/functions.models';
import { FunctionMap } from '../../../models/orchestrator/functions.constants';
import { pascalToCamelCaseKeys, transformOptions } from '../../../utils/transform';
import { FUNCTION_ENDPOINTS, FOLDER_ENDPOINTS, STUDIO_WEB_LICENSE_ENDPOINTS } from '../../../utils/constants/endpoints';
import { decodeJwtClaims, extractUserIdFromToken } from '../../../utils/encoding/jwt';
import { ODATA_PAGINATION, ODATA_OFFSET_PARAMS } from '../../../utils/constants/common';
import { resolveFolderHeaders } from '../../../utils/folder/folder-headers';
import { JOB_KEY } from '../../../utils/constants/headers';
import { createHeaders } from '../../../utils/http/headers';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { track } from '../../../core/telemetry';
import { SDKInternalsRegistry } from '../../../core/internals';
import type { IUiPath } from '../../../core/types';

/** Cap on the function names listed when a name lookup misses. */
const MAX_SUGGESTED_NAMES = 20;

/**
 * How long a license is reused when it states no expiry of its own — the free
 * grant carries no token to read one from.
 *
 * Deliberately short. Where a license states a window the SDK follows it; where
 * the platform states none, re-checking soon keeps the SDK from honouring a
 * licensing change later than it happens. Re-checking costs almost nothing: the
 * acquisition runs in parallel with the name lookup, so it hides inside a leg
 * the invocation already pays for.
 */
const FALLBACK_LICENSE_TTL_MS = 5 * 60 * 1000;

/** Renew slightly early so an invoke never races the expiry boundary. */
const LICENSE_EXPIRY_SKEW_MS = 30 * 1000;

/**
 * Cap, so a long-lived server does not accumulate an entry per user served.
 *
 * @internal
 */
export const MAX_CACHED_LICENSES = 500;

/**
 * The license cache outlives any single service instance: consumers build one
 * per request or per render, and an instance field would start empty each time.
 * A shared symbol on `globalThis` also keeps it single when `core` and
 * `functions` are bundled separately.
 */
const LICENSE_CACHE_KEY = Symbol.for('@uipath/functions-license-cache');

/** The process-wide license cache, created on first use. */
function getLicenseCache(): Map<string, LicenseCacheEntry> {
  const store = globalThis as typeof globalThis & Record<symbol, Map<string, LicenseCacheEntry> | undefined>;
  return (store[LICENSE_CACHE_KEY] ??= new Map<string, LicenseCacheEntry>());
}

/**
 * Empties the license cache. The cache is process-wide, so tests need this to
 * avoid inheriting licenses from each other.
 *
 * @internal
 */
export function clearLicenseCache(): void {
  getLicenseCache().clear();
}

/** Drops expired entries, then oldest-first, to stay under the cap. */
function evictIfFull(cache: Map<string, LicenseCacheEntry>): void {
  if (cache.size < MAX_CACHED_LICENSES) return;

  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAtMs <= now) cache.delete(key);
  }

  // Map iterates in insertion order, so this drops the oldest first.
  for (const key of cache.keys()) {
    if (cache.size < MAX_CACHED_LICENSES) break;
    cache.delete(key);
  }
}

/**
 * Service for discovering and invoking UiPath Coded Functions
 */
export class FunctionService extends FolderScopedService implements FunctionServiceModel {
  /** Folder ID → folder key (GUID); folder keys are immutable, so cache hits stay valid. */
  private readonly folderKeyCache = new Map<number, string>();

  /** Caller identity → its resolved or in-flight license acquisition. */
  private get licenseCache(): Map<string, LicenseCacheEntry> {
    return getLicenseCache();
  }

  /** Tenant this service talks to; scopes the shared license cache. */
  private readonly tenantScope: string;

  /**
   * Creates an instance of the Functions service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   */
  constructor(instance: IUiPath) {
    super(instance);
    const { config } = SDKInternalsRegistry.get(instance);
    this.tenantScope = `${config.orgName}/${config.tenantName}`;
  }

  @track('Functions.GetAll')
  async getAll<T extends FunctionGetAllOptions = FunctionGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<FunctionGetResponse>
      : NonPaginatedResponse<FunctionGetResponse>
  > {
    const { folderId, folderKey, folderPath, ...queryOptions } = options ?? {};

    const headers = resolveFolderHeaders({
      folderId,
      folderKey,
      folderPath,
      resourceType: 'Functions.getAll',
      fallbackFolderKey: this.config.folderKey,
    });

    // Rewrite renamed SDK field names → API names inside OData strings.
    const apiOptions = transformOptions(queryOptions, FunctionMap);

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => FUNCTION_ENDPOINTS.GET_ALL,
      headers,
      transformFn: (item: Record<string, unknown>) =>
        createFunctionWithMethods(this.toFunctionResponse(item), this),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: ODATA_PAGINATION.ITEMS_FIELD,
        totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: ODATA_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: ODATA_OFFSET_PARAMS.COUNT_PARAM,
        },
      },
    }, apiOptions) as Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<FunctionGetResponse>
        : NonPaginatedResponse<FunctionGetResponse>
    >;
  }

  @track('Functions.AcquireLicense')
  async acquireLicense(options?: FunctionAcquireLicenseOptions): Promise<StudioWebLicense> {
    return this.resolveLicense(options?.refresh ?? false);
  }

  @track('Functions.Invoke')
  async invoke<TInput extends object = Record<string, unknown>, TOutput = unknown>(
    func: FunctionRef,
    input?: TInput,
    options?: FunctionInvokeOptions
  ): Promise<TOutput> {
    // jobKey and refreshLicense govern only the invocation leg — keep them out of
    // the folder-scoped discovery lookup, which would forward them as query
    // params.
    const { jobKey, refreshLicense = false, ...folderOptions } = options ?? {};

    // Licensing and the name lookup are independent, so run them together: only
    // the slower of the two is paid. `allSettled` rather than `all` so a failure
    // in one still observes the other — an unobserved rejection can take down a
    // process configured to treat them as fatal.
    const [licensing, lookup] = await Promise.allSettled([
      this.resolveLicense(refreshLicense),
      this.findByName(func.name, folderOptions),
    ]);

    // Licensing is a precondition, not an optimisation: acquiring is what
    // provisions the personal robot the invocation runs on. Without it the
    // invocation fails anyway, further in, as "no personal robot configured" —
    // so surface the licensing failure instead of that.
    if (licensing.status === 'rejected') throw licensing.reason;
    if (lookup.status === 'rejected') throw lookup.reason;

    const fn = lookup.value;
    const folderKey = await this.resolveInvokeFolderKey(fn, folderOptions);
    return this.invokeFunction<TOutput>(fn, folderKey, input ?? {}, jobKey);
  }

  /**
   * Returns a license for the caller, reusing a cached one when still fresh.
   *
   * Shared by {@link invoke} and {@link acquireLicense} so only one `@track`
   * decorator fires per call — a tracked method calling another tracked one
   * would double-count the telemetry.
   */
  private async resolveLicense(refresh: boolean): Promise<StudioWebLicense> {
    const cacheKey = await this.licenseCacheKey();
    const cache = this.licenseCache;
    const now = Date.now();

    if (!refresh) {
      const cached = cache.get(cacheKey);
      // Awaiting a pending entry is the point: concurrent invokes share one
      // round trip rather than each issuing their own.
      if (cached && cached.expiresAtMs > now) return cached.acquisition;
    }

    const entry: LicenseCacheEntry = {
      acquisition: this.requestLicense(),
      // Stands in until the real expiry arrives, and earns its keep twice: a
      // pending entry is never read as stale by a concurrent caller, and an
      // acquisition that never settles stops capturing new callers once this
      // lapses. Eviction reads the expiry synchronously, so it lives on the
      // entry rather than inside the promise.
      expiresAtMs: now + FALLBACK_LICENSE_TTL_MS,
    };
    // Replacing an existing key does not grow the map, so no room is needed —
    // evicting there would drop another caller's license for nothing.
    if (!cache.has(cacheKey)) evictIfFull(cache);
    cache.set(cacheKey, entry);

    try {
      const license = await entry.acquisition;
      entry.expiresAtMs = licenseExpiryMs(license.expiresTime) ?? now + FALLBACK_LICENSE_TTL_MS;
      return license;
    } catch (error) {
      // Never cache a rejection — the next call must retry, not replay it.
      if (cache.get(cacheKey) === entry) cache.delete(cacheKey);
      throw error;
    }
  }

  /** Performs the acquisition. Takes no body and is not folder-scoped. */
  private async requestLicense(): Promise<StudioWebLicense> {
    const response = await this.post<RawStudioWebLicenseResponse>(STUDIO_WEB_LICENSE_ENDPOINTS.ACQUIRE);
    return toStudioWebLicense(response.data);
  }

  /**
   * Identifies the caller. Prefers the token's `sub` so the entry survives a
   * token refresh; opaque tokens fall back to the token itself.
   */
  private async licenseCacheKey(): Promise<string> {
    const token = await this.getValidAuthToken();
    // Tenant is in the key because the cache outlives any one service instance:
    // without it, two tenants could share a license.
    const identity = extractUserIdFromToken(token) || token;
    return `${this.tenantScope}:${identity}`;
  }

  /**
   * Resolves a function by name within the supplied folder context.
   *
   * A miss is usually a package name passed where a function name belongs, so
   * the not-found error is enriched with the names the folder actually exposes.
   */
  private async findByName(
    name: string,
    options: FolderScopedOptions
  ): Promise<RawFunctionGetResponse> {
    try {
      const { result } = await this.getByNameLookup<Record<string, unknown>, RawFunctionGetResponse>(
        'Function',
        FUNCTION_ENDPOINTS.GET_ALL,
        name,
        options,
        (raw) => this.toFunctionResponse(raw),
        FunctionMap,
      );
      return result;
    } catch (error) {
      if (isNotFoundError(error)) {
        throw await this.withAvailableFunctionNames(error, options);
      }
      throw error;
    }
  }

  /**
   * Appends the folder's function names to a not-found error. Returns the
   * original error unchanged if the names cannot be listed — a diagnostic must
   * never mask the failure it describes.
   */
  private async withAvailableFunctionNames(
    error: NotFoundError,
    options: FolderScopedOptions
  ): Promise<UiPathError> {
    try {
      const headers = resolveFolderHeaders({
        folderId: options.folderId,
        folderKey: options.folderKey,
        folderPath: options.folderPath,
        resourceType: 'Functions.invoke',
        fallbackFolderKey: this.config.folderKey,
      });

      const response = await this.get<CollectionResponse<{ Name: string }>>(FUNCTION_ENDPOINTS.GET_ALL, {
        headers,
        params: { $select: 'Name', $top: String(MAX_SUGGESTED_NAMES + 1) },
      });

      const names = response.data?.value?.map((item) => item.Name).filter(Boolean) ?? [];
      if (!names.length) {
        return new NotFoundError({ message: `${error.message} The folder exposes no functions.` });
      }

      const shown = names.slice(0, MAX_SUGGESTED_NAMES).join(', ');
      // The lookup asks for one row beyond the cap, so an overflow tells us there are
      // more names but not how many.
      const suffix = names.length > MAX_SUGGESTED_NAMES ? ', and more' : '';
      return new NotFoundError({
        message: `${error.message} Available functions: ${shown}${suffix}. Note that a function name is not the name of the package it is deployed from.`,
      });
    } catch {
      return error;
    }
  }

  /**
   * Resolves the folder key for the invoke URL. Uses the caller-supplied key
   * when present, then the SDK's init-time folder context, and otherwise looks
   * the key up from the folder ID returned with the function.
   */
  private async resolveInvokeFolderKey(
    fn: RawFunctionGetResponse,
    options: FolderScopedOptions
  ): Promise<string> {
    const explicitKey = options.folderKey?.trim();
    if (explicitKey) return explicitKey;

    const hasExplicitFolder = options.folderId !== undefined || Boolean(options.folderPath?.trim());
    if (!hasExplicitFolder && this.config.folderKey) return this.config.folderKey;

    return this.getFolderKey(fn.folderId);
  }

  /** Looks up a folder's key (GUID) from its numeric ID, with caching. */
  private async getFolderKey(folderId: number): Promise<string> {
    const cached = this.folderKeyCache.get(folderId);
    if (cached) return cached;

    const response = await this.get<RawFolderResponse>(FOLDER_ENDPOINTS.GET_BY_ID(folderId));
    const key = response.data.Key;
    this.folderKeyCache.set(folderId, key);
    return key;
  }

  /**
   * Calls the function's HTTP endpoint with the verb it declares. The platform
   * runs the function and answers with its output as the response body.
   */
  private async invokeFunction<TOutput>(
    fn: RawFunctionGetResponse,
    folderKey: string,
    input: object,
    jobKey?: string
  ): Promise<TOutput> {
    const endpoint = FUNCTION_ENDPOINTS.INVOKE(folderKey, fn.processSlug, fn.slug);
    // Attributes the run to the parent job's licensing transaction when set.
    const headers = createHeaders({ [JOB_KEY]: jobKey });

    // Functions declared with `Get` read input from query parameters; all other
    // verbs receive it as the JSON request body.
    const response = fn.method === FunctionHttpMethod.Get
      ? await this.get<TOutput>(endpoint, { params: toQueryParams(input), headers })
      : await this.request<TOutput>(fn.method, endpoint, { body: input, headers });

    return response.data;
  }

  /** Maps a raw HttpTriggers row to the public function shape. */
  private toFunctionResponse(raw: Record<string, unknown>): RawFunctionGetResponse {
    const trigger = pascalToCamelCaseKeys(raw) as RawFunctionTrigger;
    return {
      id: trigger.id,
      name: trigger.name,
      slug: trigger.slug,
      method: trigger.method as FunctionHttpMethod,
      description: trigger.description,
      enabled: trigger.enabled,
      inputArguments: trigger.inputArguments,
      entryPointPath: trigger.entryPointPath,
      processKey: trigger.releaseKey,
      processName: trigger.release.name,
      processSlug: trigger.release.slug,
      folderId: trigger.organizationUnitId,
    };
  }
}

/**
 * Maps the raw acquisition response to the SDK shape, folding in the token's
 * claims. A token the SDK cannot read costs only the derived fields.
 *
 * @internal
 */
export function toStudioWebLicense(raw: RawStudioWebLicenseResponse): StudioWebLicense {
  const claims = decodeJwtClaims<StudioWebLicenseTokenClaims>(raw.licenseToken);

  return {
    robotType: raw.robotType,
    robotTypes: raw.robotTypes,
    isLicensed: raw.isLicensed,
    startedTime: raw.started,
    expiresTime: claims?.exp ? new Date(claims.exp * 1000).toISOString() : undefined,
    licenseTier: claims?.ubl,
    licensedUnits: claims?.lu,
  };
}

/**
 * Epoch milliseconds at which a license should be renewed, from its expiry.
 * Returns `undefined` when the license carries none, costing only the
 * fallback lifetime.
 *
 * @internal
 */
export function licenseExpiryMs(expiresTime?: string): number | undefined {
  if (!expiresTime) return undefined;

  const expiresAt = new Date(expiresTime).getTime();
  if (Number.isNaN(expiresAt)) return undefined;

  return expiresAt - LICENSE_EXPIRY_SKEW_MS;
}

/** Serializes function input for GET invocations (query-string transport). */
function toQueryParams(input: object): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    params[key] = typeof value === 'object' ? JSON.stringify(value) : (value as string | number | boolean);
  }
  return params;
}
