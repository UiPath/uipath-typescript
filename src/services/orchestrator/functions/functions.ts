import { FolderScopedService } from '../../folder-scoped';
import {
  FunctionGetAllOptions,
  FunctionHttpMethod,
  FunctionInvokeOptions,
  FunctionRef,
  RawFunctionGetResponse,
} from '../../../models/orchestrator/functions.types';
import { RawFolderResponse, RawFunctionTrigger } from '../../../models/orchestrator/functions.internal-types';
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
import { FUNCTION_ENDPOINTS, FOLDER_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PAGINATION, ODATA_OFFSET_PARAMS } from '../../../utils/constants/common';
import { resolveFolderHeaders } from '../../../utils/folder/folder-headers';
import { JOB_KEY } from '../../../utils/constants/headers';
import { createHeaders } from '../../../utils/http/headers';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { track } from '../../../core/telemetry';

/** Cap on the function names listed when a name lookup misses. */
const MAX_SUGGESTED_NAMES = 20;

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
    func: FunctionRef,
    input?: TInput,
    options?: FunctionInvokeOptions
  ): Promise<TOutput> {
    // jobKey governs only the invocation leg — keep it out of the folder-scoped
    // discovery lookup, which would forward it as a query param.
    const { jobKey, ...folderOptions } = options ?? {};
    const fn = await this.findByName(func.name, folderOptions);
    const folderKey = await this.resolveInvokeFolderKey(fn, folderOptions);
    return this.invokeFunction<TOutput>(fn, folderKey, input ?? {}, jobKey);
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
      return await this.getByNameLookup<Record<string, unknown>, RawFunctionGetResponse>(
        'Function',
        FUNCTION_ENDPOINTS.GET_ALL,
        name,
        options,
        (raw) => this.toFunctionResponse(raw),
        FunctionMap,
      );
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

/** Serializes function input for GET invocations (query-string transport). */
function toQueryParams(input: object): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    params[key] = typeof value === 'object' ? JSON.stringify(value) : (value as string | number | boolean);
  }
  return params;
}
