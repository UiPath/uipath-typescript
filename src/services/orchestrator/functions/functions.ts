import { FolderScopedService } from '../../folder-scoped';
import {
  FunctionGetAllOptions,
  FunctionHttpMethod,
  FunctionInvokeOptions,
  RawFunctionGetResponse,
} from '../../../models/orchestrator/functions.types';
import { RawFolderResponse, RawFunctionTrigger } from '../../../models/orchestrator/functions.internal-types';
import {
  FunctionServiceModel,
  FunctionGetResponse,
  createFunctionWithMethods,
} from '../../../models/orchestrator/functions.models';
import { FunctionMap } from '../../../models/orchestrator/functions.constants';
import { pascalToCamelCaseKeys, transformOptions } from '../../../utils/transform';
import { FUNCTION_ENDPOINTS, FOLDER_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PAGINATION, ODATA_OFFSET_PARAMS } from '../../../utils/constants/common';
import { resolveFolderHeaders } from '../../../utils/folder/folder-headers';
import { JOB_KEY, RESPONSE_TYPES } from '../../../utils/constants/headers';
import { createHeaders } from '../../../utils/http/headers';
import { ServerError } from '../../../core/errors/server';
import { ErrorFactory } from '../../../core/errors/error-factory';
import { errorResponseParser } from '../../../core/errors/parser';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { isBrowser } from '../../../utils/platform';
import { track } from '../../../core/telemetry';

/** Default overall wait for a function invocation, in seconds. */
const DEFAULT_MAX_WAIT_SECONDS = 300;
/** Safety cap on status long-poll legs (each leg holds ~25s at the gateway). */
const MAX_POLL_LEGS = 60;
/** HTTP 303 — the gateway's "still running, poll this status URL" signal. */
const HTTP_SEE_OTHER = 303;

/**
 * Service for discovering and invoking UiPath Coded Functions
 */
export class FunctionService extends FolderScopedService implements FunctionServiceModel {
  /** Folder ID → folder key (GUID); folder keys are immutable, so cache hits stay valid. */
  private readonly folderKeyCache = new Map<number, string>();

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
    }, apiOptions) as any;
  }

  @track('Functions.Invoke')
  async invoke<TInput extends object = Record<string, unknown>, TOutput = unknown>(
    name: string,
    input?: TInput,
    options?: FunctionInvokeOptions
  ): Promise<TOutput> {
    // maxWaitSeconds and jobKey govern only the invocation leg — keep them out
    // of the folder-scoped discovery lookup, which would forward them as query params.
    const { maxWaitSeconds, jobKey, ...folderOptions } = options ?? {};
    const fn = await this.findByName(name, folderOptions);
    const folderKey = await this.resolveInvokeFolderKey(fn, folderOptions);
    return this.invokeFunction<TOutput>(
      fn,
      folderKey,
      input ?? {},
      maxWaitSeconds ?? DEFAULT_MAX_WAIT_SECONDS,
      jobKey
    );
  }

  /** Resolves a function by name within the supplied folder context. */
  private async findByName(
    name: string,
    options?: FunctionInvokeOptions
  ): Promise<RawFunctionGetResponse> {
    return this.getByNameLookup<Record<string, unknown>, RawFunctionGetResponse>(
      'Function',
      FUNCTION_ENDPOINTS.GET_ALL,
      name,
      options ?? {},
      (raw) => this.toFunctionResponse(raw),
      FunctionMap,
    );
  }

  /**
   * Resolves the folder key for the invoke URL. Uses the caller-supplied key
   * when present, then the SDK's init-time folder context, and otherwise looks
   * the key up from the folder ID returned with the function.
   */
  private async resolveInvokeFolderKey(
    fn: RawFunctionGetResponse,
    options?: FunctionInvokeOptions
  ): Promise<string> {
    const explicitKey = options?.folderKey?.trim();
    if (explicitKey) return explicitKey;

    const hasExplicitFolder = options?.folderId !== undefined || Boolean(options?.folderPath?.trim());
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
   * runs the function and returns its output as the response body.
   *
   * The gateway holds the request open for ~25s. If the function finishes in
   * that window the output comes back directly; otherwise the gateway answers
   * 303 with a status URL that itself long-polls — done → 200 + output, still
   * running → another 303 with a fresh status URL. We follow that chain
   * explicitly (redirects disabled) so the wait is bounded by `maxWaitSeconds`.
   *
   * Browsers cannot read the 303's Location (`redirect: 'manual'` yields an
   * opaqueredirect), so in a browser the request relies on the engine's
   * automatic redirect handling instead; `maxWaitSeconds` has no effect there.
   */
  private async invokeFunction<TOutput>(
    fn: RawFunctionGetResponse,
    folderKey: string,
    input: object,
    maxWaitSeconds: number,
    jobKey?: string
  ): Promise<TOutput> {
    const endpoint = FUNCTION_ENDPOINTS.INVOKE(folderKey, fn.processSlug, fn.slug);
    // Attributes the run to the parent job's licensing transaction when set.
    const headers = createHeaders({ [JOB_KEY]: jobKey });

    if (isBrowser) {
      const response = fn.method === FunctionHttpMethod.Get
        ? await this.get<TOutput>(endpoint, { params: toQueryParams(input), headers })
        : await this.request<TOutput>(fn.method.toUpperCase(), endpoint, { body: input, headers });
      return response.data;
    }

    const deadline = Date.now() + maxWaitSeconds * 1000;
    const rawSpec = { redirect: 'manual' as const, responseType: RESPONSE_TYPES.RAW, headers };

    // Functions declared with `Get` read input from query parameters; all other
    // verbs receive it as the JSON request body.
    let response = fn.method === FunctionHttpMethod.Get
      ? (await this.get<Response>(endpoint, { ...rawSpec, params: toQueryParams(input) })).data
      : (await this.request<Response>(fn.method.toUpperCase(), endpoint, { ...rawSpec, body: input })).data;

    let legs = 0;
    while (response.status === HTTP_SEE_OTHER) {
      const location = response.headers.get('location');
      if (!location) {
        throw new ServerError({
          message: `Function '${fn.name}' returned a redirect without a status URL`,
          statusCode: response.status,
        });
      }
      if (++legs > MAX_POLL_LEGS || Date.now() >= deadline) {
        throw new ServerError({
          message: `Function '${fn.name}' did not complete within ${maxWaitSeconds}s (maxWaitSeconds). It may still be running on the platform.`,
          statusCode: 504,
        });
      }
      // Location is absolute in practice; resolve against the response URL defensively.
      response = await this.pollFunctionStatus(new URL(location, response.url || undefined).toString());
    }

    return this.parseInvokeResponse<TOutput>(response);
  }

  /**
   * Long-polls one leg of the function status URL. The URL is absolute (it
   * points at the portal host, outside the SDK's path routing), so it is
   * fetched directly; the bearer token is required — the URL's signature
   * alone is rejected with 401.
   */
  private async pollFunctionStatus(statusUrl: string): Promise<Response> {
    const token = await this.getValidAuthToken();
    return fetch(statusUrl, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'manual',
    });
  }

  /** Parses the terminal response of an invocation into the function output. */
  private async parseInvokeResponse<TOutput>(response: Response): Promise<TOutput> {
    if (!response.ok) {
      const errorInfo = await errorResponseParser.parse(response);
      throw ErrorFactory.createFromHttpStatus(response.status, errorInfo);
    }
    const text = await response.text();
    if (!text) {
      return undefined as TOutput;
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new ServerError({
        message: `Function output is not valid JSON (${response.status} ${response.url})`,
        statusCode: response.status,
      });
    }
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
      folderName: trigger.organizationUnitFullyQualifiedName,
    };
  }
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
