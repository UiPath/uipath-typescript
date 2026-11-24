import { track } from '../../../core/telemetry';
import { ValidationError } from '../../../core/errors';
import { ELEMENT_ENDPOINTS } from '../../../utils/constants/endpoints';
import type { ConnectionResource } from '@/resources';
import { resolveConnectionTarget } from '@/services/integration-service/connection-target';
import { resolveRetryOptions, DEFAULT_API_CLIENT_RETRY } from '../../../utils/http/retry-policy';
import type { IUiPath } from '../../../core/types';
import {
  ExecuteMethod,
  ExecuteOptions,
  ExecuteResult,
} from '../../../models/integration-service/execution.types';
import { ConnectionRequestService } from './connection-request';

const RESOURCE_TYPE = 'Execution.execute';

/**
 * Internal class so we can decorate `execute` with `@track`. Method decorators
 * cannot be applied to free functions directly.
 *
 * @internal
 */
class Execution extends ConnectionRequestService {
  @track('Execution.Execute')
  async execute(
    connection: string | ConnectionResource,
    objectName: string,
    method: ExecuteMethod,
    options: ExecuteOptions,
  ): Promise<ExecuteResult> {
    const target = resolveConnectionTarget(connection, 'execute');
    if (!objectName) {
      throw new ValidationError({ message: 'objectName is required for execute' });
    }

    return this.send(
      target,
      {
        path: ELEMENT_ENDPOINTS.INSTANCE.EXECUTE(target.id, objectName),
        method,
        queryParams: options.queryParams,
        body: options.body,
        // `execute` has always returned text or parsed JSON, never bytes
        textResponse: true,
        label: 'execute',
        // Defaults to no retries, so an existing caller that supplies no `retry` keeps its
        // single-attempt behaviour
        retry: resolveRetryOptions(options.retry, DEFAULT_API_CLIENT_RETRY),
        timeoutMs: options.timeoutMs,
        signal: options.signal,
        folderId: options.folderId,
        folderKey: options.folderKey,
        folderPath: options.folderPath,
      },
      RESOURCE_TYPE,
    );
  }
}

/**
 * Execute an arbitrary HTTP operation against a connection instance through
 * the Integration Service passthrough endpoint.
 *
 * @experimental
 *
 * /// warning
 * Preview: This function is experimental and may change or be removed in future releases.
 * ///
 *
 * Targets `elements_/v3/element/instances/{connectionId}/{objectName}`.
 * Use this when you need to call a connector's runtime API without going
 * through a curated SDK method.
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
 * @param options - Body, query params, folder scoping (`folderId` / `folderKey` / `folderPath`),
 *   and robustness knobs (`retry`, `timeoutMs`, `signal`)
 * @returns Promise resolving to an {@link ExecuteResult}
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { execute } from '@uipath/uipath-typescript/connections';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * // GET — list records
 * const result = await execute(sdk, '<connectionId>', 'tickets', 'GET');
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
 * const result = await execute(sdk, '<connectionId>', 'tickets', 'POST', {
 *   body: { subject: 'New ticket', priority: 'high' },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // GET with query params and folder scoping — folderId and folderPath work too
 * const result = await execute(sdk, '<connectionId>', 'tickets', 'GET', {
 *   queryParams: { limit: '10', status: 'open' },
 *   folderPath: 'Shared/Finance',
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Retry transient connector failures. Retrying is off unless `maxRetries` is set.
 * const result = await execute(sdk, '<connectionId>', 'tickets', 'GET', {
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
 * // POST is not retried by default — a replay can create the same record twice.
 * // Opt in only when the connector operation is safe to repeat.
 * const result = await execute(sdk, '<connectionId>', 'tickets', 'POST', {
 *   body: { subject: 'New ticket' },
 *   retry: { maxRetries: 2, retryMethods: ['POST'] },
 * });
 * ```
 */
export function execute(
  uipath: IUiPath,
  connectionId: string,
  objectName: string,
  method?: ExecuteMethod,
  options?: ExecuteOptions,
): Promise<ExecuteResult>;
/**
 * Execute an arbitrary HTTP operation against a connection declared in
 * `uipath_resources.ts`, through the Integration Service passthrough endpoint.
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
 * @param options - Body, query params, folder scoping (`folderId` / `folderKey` / `folderPath`),
 *   and robustness knobs (`retry`, `timeoutMs`, `signal`)
 * @returns Promise resolving to an {@link ExecuteResult}
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
 * import { execute } from '@uipath/uipath-typescript/connections';
 *
 * const result = await execute(sdk, ProjectResources.helpdesk, 'tickets', 'GET');
 * ```
 */
export function execute(
  uipath: IUiPath,
  connection: ConnectionResource,
  objectName: string,
  method?: ExecuteMethod,
  options?: ExecuteOptions,
): Promise<ExecuteResult>;
export async function execute(
  uipath: IUiPath,
  connection: string | ConnectionResource,
  objectName: string,
  method: ExecuteMethod = 'GET',
  options: ExecuteOptions = {},
): Promise<ExecuteResult> {
  return new Execution(uipath).execute(connection, objectName, method, options);
}
