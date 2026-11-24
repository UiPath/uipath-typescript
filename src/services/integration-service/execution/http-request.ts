import { track } from '@/core/telemetry';
import { ValidationError } from '@/core/errors';
import { ELEMENT_ENDPOINTS } from '@/utils/constants/endpoints';
import { resolveConnectionTarget } from '@/services/integration-service/connection-target';
import type { ConnectionResource } from '@/resources';
import type { IUiPath } from '@/core/types';
import type {
  ExecuteHttpOptions,
  ExecuteHttpResult,
  ExecuteMethod,
} from '@/models/integration-service/execution.types';
import { CARRIER_METHOD, ConnectionRequestService, resolveCarrierRetry } from './connection-request';
import { unwrapProxyResponse } from './proxy-response';

const RESOURCE_TYPE = 'Execution.executeHttp';

/**
 * Internal class so we can decorate `executeHttp` with `@track`. Method decorators
 * cannot be applied to free functions directly.
 *
 * @internal
 */
class HttpRequestExecution extends ConnectionRequestService {
  @track('Execution.ExecuteHttp')
  async executeHttp(
    connection: string | ConnectionResource,
    url: string,
    method: ExecuteMethod,
    options: ExecuteHttpOptions,
  ): Promise<ExecuteHttpResult> {
    const target = resolveConnectionTarget(connection, 'executeHttp');
    if (!url) {
      throw new ValidationError({ message: 'url is required for executeHttp' });
    }

    const result = await this.send(
      target,
      {
        path: ELEMENT_ENDPOINTS.INSTANCE.HTTP_REQUEST(target.id),
        // The vendor request travels in the body of a POST, whatever its own method
        method: CARRIER_METHOD,
        retry: resolveCarrierRetry(options.retry, method),
        timeoutMs: options.timeoutMs,
        signal: options.signal,
        folderId: options.folderId,
        folderKey: options.folderKey,
        folderPath: options.folderPath,
        body: {
          method,
          url,
          headers: options.headers,
          query: options.queryParams,
          // Integration Service takes the vendor body as a string
          body:
            options.body === undefined || typeof options.body === 'string'
              ? options.body
              : JSON.stringify(options.body),
        },
      },
      RESOURCE_TYPE,
    );

    return unwrapProxyResponse(result);
  }
}

/**
 * Send an HTTP request to a vendor API through a connection. Integration Service adds the
 * connection's authentication, so the vendor's key or token never reaches your code.
 *
 * @experimental
 *
 * /// warning
 * Preview: This function is experimental and may change or be removed in future releases.
 * ///
 *
 * Use this for a vendor endpoint the connector has no object for. For a connector object or
 * activity, use {@link executeActivity}.
 *
 * The result describes the vendor's response: `status`, `headers` and `body` are the vendor's.
 * **This does not throw on non-2xx responses** — check `ok`, and `isVendorError` to tell a
 * vendor error from a call that never reached the vendor.
 *
 * When an admin remapped this connection id at deployment, the call targets the
 * connection it was mapped to.
 *
 * @param uipath - UiPath SDK instance providing authentication and configuration
 * @param connectionId - Connection GUID
 * @param url - Vendor URL. A path such as `/v2/tickets` is resolved against the connection's base URL
 * @param method - HTTP method to send to the vendor (defaults to `GET`)
 * @param options - Headers, query params, body, folder scoping (`folderId` / `folderKey` /
 *   `folderPath`), and robustness knobs (`retry`, `timeoutMs`, `signal`)
 * @returns Promise resolving to an {@link ExecuteHttpResult}
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { executeHttp } from '@uipath/uipath-typescript/connections';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * // GET a vendor endpoint
 * const result = await executeHttp(sdk, '<connectionId>', '/v2/tickets');
 * if (result.ok) {
 *   console.log(result.body);
 * } else if (result.isVendorError) {
 *   console.error(`Vendor returned ${result.status}: ${JSON.stringify(result.body)}`);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // POST with headers, query params and a JSON body
 * const result = await executeHttp(sdk, '<connectionId>', '/v2/tickets', 'POST', {
 *   headers: { 'X-Request-Source': 'my-app' },
 *   queryParams: { notify: 'true' },
 *   body: { subject: 'New ticket', priority: 'high' },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Retry a failed GET. A vendor POST is not retried unless listed in `retryMethods`.
 * const result = await executeHttp(sdk, '<connectionId>', '/v2/tickets', 'GET', {
 *   timeoutMs: 10_000,
 *   retry: { maxRetries: 3 },
 * });
 * ```
 */
export function executeHttp(
  uipath: IUiPath,
  connectionId: string,
  url: string,
  method?: ExecuteMethod,
  options?: ExecuteHttpOptions,
): Promise<ExecuteHttpResult>;
/**
 * Send an HTTP request to a vendor API through a connection declared in
 * `uipath_resources.ts`. Integration Service adds the connection's authentication.
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
 * @param url - Vendor URL. A path such as `/v2/tickets` is resolved against the connection's base URL
 * @param method - HTTP method to send to the vendor (defaults to `GET`)
 * @param options - Headers, query params, body, folder scoping (`folderId` / `folderKey` /
 *   `folderPath`), and robustness knobs (`retry`, `timeoutMs`, `signal`)
 * @returns Promise resolving to an {@link ExecuteHttpResult}
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
 * import { executeHttp } from '@uipath/uipath-typescript/connections';
 *
 * const result = await executeHttp(sdk, ProjectResources.helpdesk, '/v2/tickets');
 * ```
 */
export function executeHttp(
  uipath: IUiPath,
  connection: ConnectionResource,
  url: string,
  method?: ExecuteMethod,
  options?: ExecuteHttpOptions,
): Promise<ExecuteHttpResult>;
export async function executeHttp(
  uipath: IUiPath,
  connection: string | ConnectionResource,
  url: string,
  method: ExecuteMethod = 'GET',
  options: ExecuteHttpOptions = {},
): Promise<ExecuteHttpResult> {
  return new HttpRequestExecution(uipath).executeHttp(connection, url, method, options);
}
