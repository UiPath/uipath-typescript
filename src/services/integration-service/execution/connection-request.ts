import { BaseService } from '@/services/base';
import { SDKInternalsRegistry } from '@/core/internals';
import { CONTENT_TYPES, TRACEPARENT, UIPATH_TRACEPARENT_ID } from '@/utils/constants/headers';
import { resolveFolderScope } from '@/services/integration-service/folder-scope';
import { withConnectionFolder } from '@/services/integration-service/connection-target';
import { fetchWithRetry } from '@/utils/http/fetch-with-retry';
import { resolveRetryOptions, DEFAULT_API_CLIENT_RETRY } from '@/utils/http/retry-policy';
import type { ConnectionResource, ResolvedConnection } from '@/resources';
import type { IUiPath } from '@/core/types';
import type { UiPathConfig } from '@/core/config/config';
import type { ResolvedRetryOptions } from '@/models/common/http.internal-types';
import type { IntegrationServiceFolderContextOptions } from '@/models/integration-service/integration-service.types';
import type { ExecuteMethod, ExecuteOptions, ExecuteResult } from '@/models/integration-service/execution.types';
import { readResponseBody, readTextBody } from './response-content';

/** HTTP methods that carry a request body. */
export const BODY_METHODS = new Set<ExecuteMethod>(['POST', 'PUT', 'PATCH']);

/** Method of an Integration Service call that carries another request inside its body. */
export const CARRIER_METHOD: ExecuteMethod = 'POST';

/**
 * Retry settings for a call that travels inside a carrier request. The caller's settings
 * describe the carried method, so the carrier is retried only when that method would be.
 *
 * @param retry - The caller's retry option
 * @param method - The method the caller asked for
 * @returns The retry policy for the carrier request
 * @internal
 */
export function resolveCarrierRetry(retry: ExecuteOptions['retry'], method: ExecuteMethod): ResolvedRetryOptions {
  const resolved = resolveRetryOptions(retry, DEFAULT_API_CLIENT_RETRY);
  return { ...resolved, retryMethods: resolved.retryMethods.includes(method) ? [CARRIER_METHOD] : [] };
}

/**
 * The connector key of a call: the option when given, otherwise the key on a
 * `resource.connection()` handle.
 *
 * @param connection - Connection id or handle the call was made with
 * @param connectorKey - The caller's `connectorKey` option
 * @returns The connector key, or `undefined` when neither names one
 * @internal
 */
export function resolveConnectorKey(
  connection: string | ConnectionResource,
  connectorKey: string | undefined,
): string | undefined {
  return connectorKey ?? (typeof connection === 'string' ? undefined : connection.connector);
}

/**
 * One request against a connection instance.
 *
 * @internal
 */
export interface ConnectionRequest extends IntegrationServiceFolderContextOptions {
  /** Endpoint path, relative to the tenant. */
  path: string;
  /** HTTP method of the Integration Service call. */
  method: ExecuteMethod;
  /** Query string parameters. */
  queryParams?: Record<string, string>;
  /** Body, serialized as JSON. Sent only with a method that carries one. */
  body?: unknown;
  /** Multipart body. Sent in place of `body`. */
  form?: FormData;
  /** Read a 2xx response as bytes whatever its content type. */
  fileResponse?: boolean;
  /** Always read the response as text, never as a file. */
  textResponse?: boolean;
  /** Method name used in the warning for a non-JSON body. Defaults to the resource type. */
  label?: string;
  /** Retry policy, already resolved against the defaults. */
  retry: ResolvedRetryOptions;
  /** Timeout for a single attempt, in milliseconds. */
  timeoutMs?: number;
  /** Signal for cancelling the request. */
  signal?: AbortSignal;
}

/**
 * Shared plumbing for calls against a connection instance: URL, authentication, folder and
 * tracing headers, retry, and reading the response without throwing on a non-2xx status.
 *
 * @internal
 */
export abstract class ConnectionRequestService extends BaseService {
  private readonly requestConfig: Pick<UiPathConfig, 'baseUrl' | 'orgName' | 'tenantName'>;

  /**
   * Creates an instance of the service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   */
  constructor(instance: IUiPath) {
    super(instance);
    const { config } = SDKInternalsRegistry.get(instance);
    this.requestConfig = config;
  }

  /**
   * Sends one request and returns the full HTTP envelope.
   *
   * @param target - The connection the call targets, after overrides
   * @param request - What to send
   * @param resourceType - Label used in folder error messages (e.g. `'Execution.execute'`)
   * @returns The response envelope, whatever its status
   */
  protected async send(
    target: ResolvedConnection,
    request: ConnectionRequest,
    resourceType: string,
  ): Promise<ExecuteResult> {
    const token = await this.getValidAuthToken();

    const baseSegment = `${this.requestConfig.orgName}/${this.requestConfig.tenantName}/`;
    const url = new URL(baseSegment + request.path, this.requestConfig.baseUrl).toString();

    let fullUrl = url;
    if (request.queryParams && Object.keys(request.queryParams).length > 0) {
      const qs = new URLSearchParams(request.queryParams).toString();
      const sep = url.includes('?') ? '&' : '?';
      fullUrl = `${url}${sep}${qs}`;
    }

    const traceId = crypto.randomUUID().replace(/-/g, '');
    const spanId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const traceparentValue = `00-${traceId}-${spanId}-01`;

    const { folderId, folderKey, folderPath } = request;
    const { headers: folderHeaders } = resolveFolderScope(
      withConnectionFolder({ folderId, folderKey, folderPath }, target),
      resourceType,
      this.config.metaFolderKey,
    );

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      [TRACEPARENT]: traceparentValue,
      [UIPATH_TRACEPARENT_ID]: traceparentValue,
      ...folderHeaders,
    };

    // A form sets its own Content-Type, with the boundary
    const hasBody = !request.form && request.body !== undefined && BODY_METHODS.has(request.method);
    if (hasBody) {
      headers['Content-Type'] = CONTENT_TYPES.JSON;
    }

    const response = await fetchWithRetry(
      fullUrl,
      {
        method: request.method,
        headers,
        body: request.form ?? (hasBody ? JSON.stringify(request.body) : undefined),
      },
      {
        retry: request.retry,
        timeoutMs: request.timeoutMs,
        signal: request.signal,
      },
    );

    const flatHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      flatHeaders[key] = value;
    });

    const label = request.label ?? resourceType;
    const parsed = request.textResponse
      ? await readTextBody(response, label)
      : await readResponseBody(response, flatHeaders, request.fileResponse === true, label);

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: parsed,
      headers: flatHeaders,
    };
  }
}
