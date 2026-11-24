import { track } from '@/core/telemetry';
import { ValidationError } from '@/core/errors';
import { ELEMENT_ENDPOINTS, ELEMENT_V4_ENDPOINTS } from '@/utils/constants/endpoints';
import { resolveConnectionTarget } from '@/services/integration-service/connection-target';
import { resolveRetryOptions, DEFAULT_API_CLIENT_RETRY } from '@/utils/http/retry-policy';
import type { ConnectionResource, ResolvedConnection } from '@/resources';
import type { IUiPath } from '@/core/types';
import type {
  ExecuteMethod,
  ExecuteActivityOptions,
  ExecuteActivityResult,
} from '@/models/integration-service/execution.types';
import {
  BODY_METHODS,
  CARRIER_METHOD,
  ConnectionRequestService,
  resolveCarrierRetry,
  resolveConnectorKey,
  type ConnectionRequest,
} from './connection-request';
import { NEXT_PAGE_PARAM, extractPage, resolveMaxRecords, stripPaginationHeaders } from './pagination';
import { expandBodyPaths, isPlainRecord } from './body-paths';
import { buildMultipartForm, validateFiles } from './multipart';
import { encodeUrlInputs } from './url-input';
import { buildV4ActivityManifest, unwrapV4Response, usesV4Engine } from './v4-execute';

const RESOURCE_TYPE = 'Execution.executeActivity';

/** Options that belong to one engine only; passing one to the other engine is refused. */
const V3_ONLY_OPTIONS = ['files', 'bodyPartName', 'urlInputFields', 'fileResponse', 'maxRecords'] as const;
const V4_ONLY_OPTIONS = ['scriptRef', 'headers'] as const;

/** True when the caller set an option to something that asks for work: not `undefined`, `false` or an empty list. */
function isSet(value: unknown): boolean {
  if (value === undefined || value === false) return false;
  return !Array.isArray(value) || value.length > 0;
}

/** Refuses the options the engine in use cannot honour, so none is dropped without a word. */
function assertEngineOptions(options: ExecuteActivityOptions, onV4: boolean): void {
  const refused = (onV4 ? V3_ONLY_OPTIONS : V4_ONLY_OPTIONS).filter((name) => isSet(options[name]));
  if (refused.length === 0) return;
  const engine = onV4 ? 'on a version 4 connector' : 'without a version 4 connector';
  throw new ValidationError({
    message: `${refused.join(', ')} ${refused.length === 1 ? 'is' : 'are'} not supported by executeActivity ${engine}`,
  });
}

/**
 * Internal class so we can decorate `executeActivity` with `@track`. Method decorators
 * cannot be applied to free functions directly.
 *
 * @internal
 */
class ActivityExecution extends ConnectionRequestService {
  @track('Execution.ExecuteActivity')
  async executeActivity(
    connection: string | ConnectionResource,
    objectName: string,
    method: ExecuteMethod,
    options: ExecuteActivityOptions,
  ): Promise<ExecuteActivityResult> {
    const target = resolveConnectionTarget(connection, 'executeActivity');
    if (!objectName) {
      throw new ValidationError({ message: 'objectName is required for executeActivity' });
    }
    const maxRecords = resolveMaxRecords(options.maxRecords, 'executeActivity');
    const files = options.files?.length ? options.files : undefined;
    if (files) validateFiles(files, 'executeActivity');

    const body = isPlainRecord(options.body) ? expandBodyPaths(options.body) : options.body;

    const onV4 = usesV4Engine(options.connectorVersion);
    assertEngineOptions(options, onV4);

    if (onV4) {
      const connectorKey = resolveConnectorKey(connection, options.connectorKey);
      if (!connectorKey) {
        throw new ValidationError({ message: 'connectorKey is required for executeActivity on a version 4 connector' });
      }
      const answer = await this.send(
        target,
        {
          path: ELEMENT_V4_ENDPOINTS.EXECUTE,
          // The activity always travels in a POST; `method` is the activity's own operation
          method: CARRIER_METHOD,
          body: buildV4ActivityManifest({
            connectionId: target.id,
            connectorKey,
            scriptRef: options.scriptRef ?? objectName,
            body,
            queryParams: options.queryParams,
            headers: options.headers,
          }),
          retry: resolveCarrierRetry(options.retry, method),
          timeoutMs: options.timeoutMs,
          signal: options.signal,
          folderId: options.folderId,
          folderKey: options.folderKey,
          folderPath: options.folderPath,
        },
        RESOURCE_TYPE,
      );
      const { isVendorError: _isVendorError, ...vendor } = unwrapV4Response(answer);
      return vendor;
    }

    const request: ConnectionRequest = {
      path: ELEMENT_ENDPOINTS.INSTANCE.EXECUTE(target.id, objectName),
      method,
      queryParams: encodeUrlInputs(options.queryParams, options.urlInputFields),
      // Integration Service rejects a write that arrives with no body at all
      body: body === undefined && BODY_METHODS.has(method) ? {} : body,
      form: files ? buildMultipartForm(files, body, options.bodyPartName) : undefined,
      fileResponse: options.fileResponse,
      // No retries unless the caller asks for them
      retry: resolveRetryOptions(options.retry, DEFAULT_API_CLIENT_RETRY),
      timeoutMs: options.timeoutMs,
      signal: options.signal,
      folderId: options.folderId,
      folderKey: options.folderKey,
      folderPath: options.folderPath,
    };

    const first = await this.send(target, request, RESOURCE_TYPE);
    if (maxRecords === undefined || method !== 'GET' || !first.ok || !Array.isArray(first.body)) {
      return withPage(first);
    }
    return this.collectPages(target, request, first, first.body, maxRecords);
  }

  /**
   * Follows the connector's pages until `maxRecords` records are gathered or the list ends.
   * A page that fails is returned as the result, so the caller sees the failure.
   */
  private async collectPages(
    target: ResolvedConnection,
    request: ConnectionRequest,
    first: ExecuteActivityResult,
    firstRecords: unknown[],
    maxRecords: number,
  ): Promise<ExecuteActivityResult> {
    const records = [...firstRecords];
    let last = first;
    let page = extractPage(first.headers, first.body);
    let followed = false;

    while (page?.hasMore && records.length < maxRecords) {
      const next = await this.send(
        target,
        { ...request, queryParams: { ...request.queryParams, [NEXT_PAGE_PARAM]: page.nextPageToken } },
        RESOURCE_TYPE,
      );
      if (!next.ok) return next;

      followed = true;
      last = next;
      if (Array.isArray(next.body)) records.push(...next.body);
      page = extractPage(next.headers, next.body);
    }

    if (!followed && records.length <= maxRecords) {
      return withPage(first);
    }
    return {
      ...last,
      body: records.slice(0, maxRecords),
      headers: stripPaginationHeaders(last.headers),
    };
  }
}

/** Adds the paging state to a single-page result when the connector reported one. */
function withPage(result: ExecuteActivityResult): ExecuteActivityResult {
  const page = extractPage(result.headers, result.body);
  return page ? { ...result, page } : result;
}

/**
 * Run a connector activity: one operation on a connector object, through a connection.
 *
 * Does what {@link execute} does and adds what a connector activity needs: body keys given as
 * paths, file upload and download, paging, and query parameters that take a URL.
 *
 * @experimental
 *
 * /// warning
 * Preview: This function is experimental and may change or be removed in future releases.
 * ///
 *
 * A write (`POST`, `PUT`, `PATCH`) sent without a body carries an empty JSON object, and a file
 * response is returned as a `Uint8Array`.
 *
 * Unlike standard SDK methods, **this does not throw on non-2xx responses**.
 * The full HTTP envelope (`ok`, `status`, `body`, `headers`) is returned so
 * callers can surface connector-specific error bodies.
 *
 * When an admin remapped this connection id at deployment, the call targets the
 * connection it was mapped to.
 *
 * @param uipath - UiPath SDK instance providing authentication and configuration
 * @param connectionId - Connection GUID
 * @param objectName - Connector object name (e.g. `tickets`, `messages`)
 * @param method - HTTP method (defaults to `GET`)
 * @param options - Body, query params, files, paging (`maxRecords`), folder scoping
 *   (`folderId` / `folderKey` / `folderPath`), and robustness knobs (`retry`, `timeoutMs`, `signal`)
 * @returns Promise resolving to an {@link ExecuteActivityResult}
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { executeActivity } from '@uipath/uipath-typescript/connections';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * // GET — list records
 * const result = await executeActivity(sdk, '<connectionId>', 'tickets', 'GET');
 * if (result.ok) {
 *   console.log(result.body);
 * } else {
 *   console.error(`Connector returned ${result.status}: ${JSON.stringify(result.body)}`);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // POST — create a record
 * const result = await executeActivity(sdk, '<connectionId>', 'tickets', 'POST', {
 *   body: { subject: 'New ticket', priority: 'high' },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // GET with query params and folder scoping — folderId and folderPath work too
 * const result = await executeActivity(sdk, '<connectionId>', 'tickets', 'GET', {
 *   queryParams: { limit: '10', status: 'open' },
 *   folderPath: 'Shared/Finance',
 * });
 * ```
 *
 * @example
 * ```typescript
 * // One page at a time: `page` is set while the connector has more records
 * const first = await executeActivity(sdk, '<connectionId>', 'tickets', 'GET');
 * if (first.page?.hasMore) {
 *   const second = await executeActivity(sdk, '<connectionId>', 'tickets', 'GET', {
 *     queryParams: { nextPage: first.page.nextPageToken },
 *   });
 * }
 *
 * // Or let the call follow the pages: up to 250 records, or every record with -1
 * const tickets = await executeActivity(sdk, '<connectionId>', 'tickets', 'GET', { maxRecords: 250 });
 * ```
 *
 * @example
 * ```typescript
 * // Upload a file. The body travels as a JSON part next to it.
 * const uploaded = await executeActivity(sdk, '<connectionId>', 'files', 'POST', {
 *   files: [{ name: 'file', content: fileBytes, fileName: 'report.pdf', contentType: 'application/pdf' }],
 *   body: { title: 'Quarterly report' },
 * });
 *
 * // Download a file: `body` is a Uint8Array
 * const download = await executeActivity(sdk, '<connectionId>', 'files/<fileId>/content', 'GET', {
 *   fileResponse: true,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Retry transient connector failures. Retrying is off unless `maxRetries` is set.
 * const result = await executeActivity(sdk, '<connectionId>', 'tickets', 'GET', {
 *   timeoutMs: 10_000,
 *   retry: {
 *     maxRetries: 3,
 *     initialDelayMs: 500,
 *     backoffStrategy: 'exponential',
 *     backoffFactor: 2,
 *     retryableStatusCodes: [429, 500, 502, 503, 504],
 *   },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // A connector of version 4 or later: pass its version and key. `objectName` names the script.
 * const sent = await executeActivity(sdk, '<connectionId>', 'SendMessageToChannel', 'POST', {
 *   connectorVersion: '4.0.0',
 *   connectorKey: 'uipath-salesforce-slack',
 *   queryParams: { send_as: 'bot' },
 *   body: { channel: '<channelId>', messageToSend: 'Hello' },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // POST is not retried by default — a replay can create the same record twice.
 * // Opt in only when the connector operation is safe to repeat.
 * const result = await executeActivity(sdk, '<connectionId>', 'tickets', 'POST', {
 *   body: { subject: 'New ticket' },
 *   retry: { maxRetries: 2, retryMethods: ['POST'] },
 * });
 * ```
 */
export function executeActivity(
  uipath: IUiPath,
  connectionId: string,
  objectName: string,
  method?: ExecuteMethod,
  options?: ExecuteActivityOptions,
): Promise<ExecuteActivityResult>;
/**
 * Run a connector activity through a connection declared in `uipath_resources.ts`.
 *
 * @experimental
 *
 * /// warning
 * Preview: This function is experimental and may change or be removed in future releases.
 * ///
 *
 * When an admin remapped the connection at deployment, the call targets the
 * connection it was mapped to, in that connection's folder, even when a folder
 * option is passed. Like the id form, this does not throw on non-2xx responses.
 *
 * @param uipath - UiPath SDK instance providing authentication and configuration
 * @param connection - Handle created with `resource.connection()` from `@uipath/uipath-typescript/resources`
 * @param objectName - Connector object name (e.g. `tickets`, `messages`)
 * @param method - HTTP method (defaults to `GET`)
 * @param options - Body, query params, files, paging (`maxRecords`), folder scoping
 *   (`folderId` / `folderKey` / `folderPath`), and robustness knobs (`retry`, `timeoutMs`, `signal`)
 * @returns Promise resolving to an {@link ExecuteActivityResult}
 *
 * @example
 * ```typescript
 * // uipath_resources.ts
 * import { resource } from '@uipath/uipath-typescript/resources';
 *
 * export class ProjectResources {
 *   static readonly helpdesk = resource.connection({ id: '<connectionId>', connector: 'uipath-zendesk' });
 * }
 *
 * // anywhere in the project
 * import { executeActivity } from '@uipath/uipath-typescript/connections';
 *
 * const result = await executeActivity(sdk, ProjectResources.helpdesk, 'tickets', 'GET');
 * ```
 */
export function executeActivity(
  uipath: IUiPath,
  connection: ConnectionResource,
  objectName: string,
  method?: ExecuteMethod,
  options?: ExecuteActivityOptions,
): Promise<ExecuteActivityResult>;
export async function executeActivity(
  uipath: IUiPath,
  connection: string | ConnectionResource,
  objectName: string,
  method: ExecuteMethod = 'GET',
  options: ExecuteActivityOptions = {},
): Promise<ExecuteActivityResult> {
  return new ActivityExecution(uipath).executeActivity(connection, objectName, method, options);
}
