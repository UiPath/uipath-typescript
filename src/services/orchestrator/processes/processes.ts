import { FolderScopedService } from '../../folder-scoped';
import { CollectionResponse, RequestOptions } from '../../../models/common/types';
import {
  ProcessGetResponse,
  ProcessGetAllOptions,
  ProcessRef,
  ProcessStartRefOptions,
  ProcessStartRequest,
  ProcessStartResponse,
  ProcessGetByIdOptions,
  ProcessGetByNameOptions,
  ProcessStartOptions,
} from '../../../models/orchestrator/processes.types';
import { ProcessServiceModel } from '../../../models/orchestrator/processes.models';
import { addPrefixToKeys, pascalToCamelCaseKeys, transformData, transformRequest, transformOptions } from '../../../utils/transform';
import { createHeaders } from '../../../utils/http/headers';
import { ProcessMap } from '../../../models/orchestrator/processes.constants';
import { FOLDER_ID } from '../../../utils/constants/headers';
import { PROCESS_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PREFIX, ODATA_PAGINATION, ODATA_OFFSET_PARAMS } from '../../../utils/constants/common';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { track } from '../../../core/telemetry';
import { resolveFolderHeaders } from '../../../utils/folder/folder-headers';
import { resolveOverride } from '../../../utils/overrides/resolve-override';
import { ValidationError } from '../../../core/errors';

/**
 * Service for interacting with UiPath Orchestrator Processes API
 */
export class ProcessService extends FolderScopedService implements ProcessServiceModel {
  @track('Processes.GetAll')
  async getAll<T extends ProcessGetAllOptions = ProcessGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<ProcessGetResponse>
      : NonPaginatedResponse<ProcessGetResponse>
  > {
    // Transformation function for processes
    const transformProcessResponse = (process: any) =>
      transformData(pascalToCamelCaseKeys(process) as ProcessGetResponse, ProcessMap);

    // Rewrite renamed SDK field names → API names inside OData strings
    // before delegating, mirroring the transformRequest pattern used for
    // request bodies.
    const apiOptions = options ? transformOptions(options, ProcessMap) : options;

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => PROCESS_ENDPOINTS.GET_ALL,
      getByFolderEndpoint: PROCESS_ENDPOINTS.GET_ALL, // Processes use same endpoint for both
      transformFn: transformProcessResponse,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: ODATA_PAGINATION.ITEMS_FIELD,
        totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM,      
          offsetParam: ODATA_OFFSET_PARAMS.OFFSET_PARAM,           
          countParam: ODATA_OFFSET_PARAMS.COUNT_PARAM              
        }
      }
    }, apiOptions) as any;
  }

  start(processRef: ProcessRef, options?: ProcessStartRefOptions): Promise<ProcessStartResponse[]>;
  start(request: ProcessStartRequest, options?: ProcessStartOptions): Promise<ProcessStartResponse[]>;
  start(request: ProcessStartRequest, folderId: number, options?: RequestOptions): Promise<ProcessStartResponse[]>;
  @track('Processes.Start')
  async start(
    firstArg: ProcessRef | ProcessStartRequest,
    optionsOrFolderId?: ProcessStartRefOptions | ProcessStartOptions | number,
    legacyOptions?: RequestOptions,
  ): Promise<ProcessStartResponse[]> {
    // A ProcessRef declares exactly one of `id`/`name`/`key` and NEVER carries
    // `processKey`/`processName`. That combination cleanly separates the ref
    // form from the legacy `ProcessStartRequest` form at runtime.
    const looksLikeRef = isProcessRef(firstArg);
    const looksLikeLegacy = isLegacyStartRequest(firstArg);
    if (!looksLikeRef && !looksLikeLegacy) {
      throw new ValidationError({
        message: 'Processes.start: first argument must be a ProcessRef (`{ id }`, `{ name }`, or `{ key }`) or a ProcessStartRequest (`{ processKey }` or `{ processName }`).',
      });
    }

    let folderId: number | undefined;
    let folderKey: string | undefined;
    let folderPath: string | undefined;
    let queryOptions: RequestOptions = {};
    let startInfoExtras: Record<string, unknown> = {};

    if (typeof optionsOrFolderId === 'number') {
      // Legacy positional form: start(request, folderId, options?)
      folderId = optionsOrFolderId;
      queryOptions = legacyOptions ?? {};
    } else if (looksLikeRef) {
      // Ref form: start(processRef, options?) — options combines folder scoping + startInfo fields
      const { folderId: fid, folderKey: fkey, folderPath: fpath, expand, select, filter, orderby, ...restStartInfo } =
        (optionsOrFolderId ?? {}) as ProcessStartRefOptions;
      folderId = fid;
      folderKey = fkey;
      folderPath = fpath;
      queryOptions = { expand, select, filter, orderby };
      startInfoExtras = restStartInfo;
    } else {
      // Legacy form: start(request, options?)
      const { folderId: fid, folderKey: fkey, folderPath: fpath, ...rest } =
        (optionsOrFolderId ?? {}) as ProcessStartOptions;
      folderId = fid;
      folderKey = fkey;
      folderPath = fpath;
      queryOptions = rest;
    }

    // Resolve the effective identity + folderPath. Overrides apply to name/key on both the
    // new ref form and the legacy processName/processKey path — matching Assets and Queues.
    const identity = looksLikeRef
      ? await this.resolveProcessRefIdentity(firstArg as ProcessRef, folderId, folderKey, folderPath)
      : resolveLegacyIdentity(firstArg as ProcessStartRequest, folderPath);

    const headers = resolveFolderHeaders({
      folderId,
      folderKey,
      folderPath: identity.folderPath ?? folderPath,
      resourceType: 'Processes.start',
      fallbackFolderKey: this.config.folderKey,
    });

    // Build the startInfo shape. For the ref form we synthesize a ProcessStartRequest with just
    // the resolved identity + the extra startInfo fields the caller passed via options.
    const startInfoSdk: Record<string, unknown> = looksLikeRef
      ? { ...startInfoExtras, ...identity.identity }
      : { ...(firstArg as ProcessStartRequest), ...identity.identity };

    // When a key→name override redirected the legacy `processKey` path, drop the caller's
    // `processKey` from the wire body — otherwise the API receives both `ReleaseName` (from
    // the override) AND an unrelated `ReleaseKey`, and its precedence rules pick one silently.
    if (!looksLikeRef && (identity as { dropProcessKey?: boolean }).dropProcessKey) {
      delete startInfoSdk.processKey;
    }

    const apiRequest = transformRequest(startInfoSdk, ProcessMap);
    const requestBody = { startInfo: apiRequest };

    // Rewrite renamed SDK field names → API names inside OData strings,
    // then prefix all query parameter keys with '$' for OData.
    const apiFieldOptions = transformOptions(queryOptions, ProcessMap);
    const apiOptions = addPrefixToKeys(apiFieldOptions, ODATA_PREFIX, Object.keys(apiFieldOptions));

    const response = await this.post<CollectionResponse<ProcessStartResponse>>(
      PROCESS_ENDPOINTS.START_PROCESS,
      requestBody,
      {
        params: apiOptions,
        headers
      }
    );

    const transformedProcess = response.data?.value.map(process =>
      transformData(pascalToCamelCaseKeys(process) as ProcessStartResponse, ProcessMap)
    );

    return transformedProcess;
  }

  /**
   * Resolves a {@link ProcessRef} into the wire identity fields the StartJobs body accepts.
   * `{ name }` and `{ key }` route through {@link resolveOverride} so a runtime redirect steers
   * both the wire identity AND the follow-up folderPath header. `{ id }` triggers a getById
   * lookup and reuses the returned release key. Returns the identity fragment plus the effective
   * folderPath (populated only when an override applied a redirect).
   */
  private async resolveProcessRefIdentity(
    processRef: ProcessRef,
    folderId: number | undefined,
    folderKey: string | undefined,
    folderPath: string | undefined,
  ): Promise<{ identity: Record<string, string>; folderPath?: string }> {
    if (processRef && 'name' in processRef && processRef.name) {
      const override = resolveOverride('Process', processRef.name, folderPath);
      return {
        identity: { processName: override?.name ?? processRef.name },
        folderPath: override?.folderPath,
      };
    }
    if (processRef && 'key' in processRef && processRef.key) {
      // Overrides on stable keys are unusual but not forbidden — same shape as `{name}`.
      const override = resolveOverride('Process', processRef.key, folderPath);
      return {
        identity: override?.name
          // Override redirected key → name: switch wire identity accordingly.
          ? { processName: override.name }
          : { processKey: processRef.key },
        folderPath: override?.folderPath,
      };
    }
    if (processRef && 'id' in processRef && processRef.id != null) {
      if (folderId == null) {
        throw new ValidationError({
          message: 'Processes.start: `{ id }` refs require `folderId` in options — Process getById is folderId-scoped.',
        });
      }
      const process = await this.getById(processRef.id, folderId);
      return { identity: { processKey: process.key } };
    }
    throw new ValidationError({
      message: 'Processes.start: processRef must supply exactly one of `id`, `name`, or `key`.',
    });
  }

  @track('Processes.GetById')
  async getById(id: number, folderId: number, options: ProcessGetByIdOptions = {}): Promise<ProcessGetResponse> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });

    const apiFieldOptions = transformOptions(options, ProcessMap);
    const apiOptions = addPrefixToKeys(apiFieldOptions, ODATA_PREFIX, Object.keys(apiFieldOptions));

    const response = await this.get<ProcessGetResponse>(
      PROCESS_ENDPOINTS.GET_BY_ID(id),
      { 
        headers,
        params: apiOptions
      }
    );

    const transformedProcess = transformData(pascalToCamelCaseKeys(response.data) as ProcessGetResponse, ProcessMap);

    return transformedProcess;
  }

  @track('Processes.GetByName')
  async getByName(name: string, options: ProcessGetByNameOptions = {}): Promise<ProcessGetResponse> {
    const { result } = await this.getByNameLookup<ProcessGetResponse, ProcessGetResponse>(
      'Process',
      PROCESS_ENDPOINTS.GET_ALL,
      name,
      options,
      (raw) => transformData(pascalToCamelCaseKeys(raw), ProcessMap),
      ProcessMap,
    );
    return result;
  }
}

/**
 * Discriminates a {@link ProcessRef} argument from a legacy `ProcessStartRequest`. Only refs
 * carry `id` / `name` / `key`; only requests carry `processKey` / `processName`. Presence of
 * either request field on the argument rules out the ref form.
 */
function isProcessRef(arg: unknown): boolean {
  if (arg == null || typeof arg !== 'object') return false;
  const obj = arg as Record<string, unknown>;
  if ('processKey' in obj || 'processName' in obj) return false;
  return 'id' in obj || 'name' in obj || 'key' in obj;
}

/** True when the argument carries a legacy `ProcessStartRequest` identity field. */
function isLegacyStartRequest(arg: unknown): boolean {
  if (arg == null || typeof arg !== 'object') return false;
  const obj = arg as Record<string, unknown>;
  return 'processKey' in obj || 'processName' in obj;
}

/**
 * Applies the runtime resource-overrides table to the legacy `ProcessStartRequest.processName`
 * (or `.processKey`) fields, mirroring the behaviour on the new ref form. Returns the identity
 * fragment to spread over the request + the redirect's folderPath when present.
 *
 * `dropProcessKey` signals the caller must strip `processKey` from the base request body — set
 * only when a `{ processKey }` request is redirected to a name; without the strip the wire body
 * would carry both `ReleaseName` (from the override) AND an unrelated `ReleaseKey`.
 */
function resolveLegacyIdentity(
  request: ProcessStartRequest,
  folderPath: string | undefined,
): { identity: Record<string, string>; folderPath?: string; dropProcessKey?: boolean } {
  if ((request as { processName?: string }).processName) {
    const name = (request as { processName: string }).processName;
    const override = resolveOverride('Process', name, folderPath);
    return {
      identity: override?.name ? { processName: override.name } : {},
      folderPath: override?.folderPath,
    };
  }
  if ((request as { processKey?: string }).processKey) {
    const key = (request as { processKey: string }).processKey;
    const override = resolveOverride('Process', key, folderPath);
    if (override?.name) {
      // Key→name redirect: return the name and signal caller to drop the original processKey.
      return {
        identity: { processName: override.name },
        folderPath: override?.folderPath,
        dropProcessKey: true,
      };
    }
    return { identity: {}, folderPath: override?.folderPath };
  }
  return { identity: {} };
}
