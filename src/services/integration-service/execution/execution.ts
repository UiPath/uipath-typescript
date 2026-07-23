import { BaseService } from '../../base';
import { track } from '../../../core/telemetry';
import { ValidationError } from '../../../core/errors';
import { SDKInternalsRegistry } from '../../../core/internals';
import { ELEMENT_ENDPOINTS } from '../../../utils/constants/endpoints';
import { FOLDER_KEY, CONTENT_TYPES, TRACEPARENT, UIPATH_TRACEPARENT_ID } from '../../../utils/constants/headers';
import type { IUiPath } from '../../../core/types';
import type { UiPathConfig } from '../../../core/config/config';
import {
  ExecuteMethod,
  ExecuteOptions,
  ExecuteResult,
} from '../../../models/integration-service/execution.types';

/** HTTP methods that carry a request body. */
const BODY_METHODS = new Set<ExecuteMethod>(['POST', 'PUT', 'PATCH']);

/**
 * Internal class so we can decorate `execute` with `@track`. Method decorators
 * cannot be applied to free functions directly.
 *
 * @internal
 */
class Execution extends BaseService {
  private readonly execConfig: Pick<UiPathConfig, 'baseUrl' | 'orgName' | 'tenantName'>;

  /**
   * Creates an instance of the Execution service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   */
  constructor(instance: IUiPath) {
    super(instance);
    const { config } = SDKInternalsRegistry.get(instance);
    this.execConfig = config;
  }

  @track('Execution.Execute')
  async execute(
    connectionId: string,
    objectName: string,
    method: ExecuteMethod,
    options: ExecuteOptions,
  ): Promise<ExecuteResult> {
    if (!connectionId) {
      throw new ValidationError({ message: 'connectionId is required for execute' });
    }
    if (!objectName) {
      throw new ValidationError({ message: 'objectName is required for execute' });
    }

    const token = await this.getValidAuthToken();

    const relativePath = ELEMENT_ENDPOINTS.INSTANCE.EXECUTE(connectionId, objectName);
    const baseSegment = `${this.execConfig.orgName}/${this.execConfig.tenantName}/`;
    const url = new URL(baseSegment + relativePath, this.execConfig.baseUrl).toString();

    let fullUrl = url;
    if (options.queryParams && Object.keys(options.queryParams).length > 0) {
      const qs = new URLSearchParams(options.queryParams).toString();
      const sep = url.includes('?') ? '&' : '?';
      fullUrl = `${url}${sep}${qs}`;
    }

    const traceId = crypto.randomUUID().replace(/-/g, '');
    const spanId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const traceparentValue = `00-${traceId}-${spanId}-01`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      [TRACEPARENT]: traceparentValue,
      [UIPATH_TRACEPARENT_ID]: traceparentValue,
    };
    if (options.folderKey) {
      headers[FOLDER_KEY] = options.folderKey;
    }

    const hasBody = options.body !== undefined && BODY_METHODS.has(method);
    if (hasBody) {
      headers['Content-Type'] = CONTENT_TYPES.JSON;
    }

    const response = await fetch(fullUrl, {
      method,
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    let parsed: unknown = text;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    const flatHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      flatHeaders[key] = value;
    });

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: parsed,
      headers: flatHeaders,
    };
  }
}

/**
 * Execute an arbitrary HTTP operation against a connection instance through
 * the Integration Service passthrough endpoint.
 *
 * Targets `elements_/v3/element/instances/{connectionId}/{objectName}`.
 * Use this when you need to call a connector's runtime API without going
 * through a curated SDK method.
 *
 * Unlike standard SDK methods, **this does not throw on non-2xx responses**.
 * The full HTTP envelope (`ok`, `status`, `body`, `headers`) is returned so
 * callers can surface connector-specific error bodies.
 *
 * @param uipath - UiPath SDK instance providing authentication and configuration
 * @param connectionId - Connection GUID
 * @param objectName - Connector object name (e.g. `tickets`, `messages`)
 * @param method - HTTP method (defaults to `GET`)
 * @param options - Body, query params, and folder scoping
 * @returns Promise resolving to an {@link ExecuteResult}
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { execute } from '@uipath/uipath-typescript/is-execution';
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
 * // GET with query params and folder scoping
 * const result = await execute(sdk, '<connectionId>', 'tickets', 'GET', {
 *   queryParams: { limit: '10', status: 'open' },
 *   folderKey: '<folderKey>',
 * });
 * ```
 */
export async function execute(
  uipath: IUiPath,
  connectionId: string,
  objectName: string,
  method: ExecuteMethod = 'GET',
  options: ExecuteOptions = {},
): Promise<ExecuteResult> {
  return new Execution(uipath).execute(connectionId, objectName, method, options);
}
