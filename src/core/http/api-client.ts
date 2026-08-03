import { Config } from '../config/config';
import { ExecutionContext } from '../context/execution';
import { RequestSpec } from '../../models/common/request-spec';
import { TokenManager } from '../auth/token-manager';
import { errorResponseParser } from '../errors/parser';
import { ErrorFactory } from '../errors/error-factory';
import { ServerError } from '../errors/server';
import { CONTENT_TYPES, RESPONSE_TYPES, TRACEPARENT, UIPATH_TRACEPARENT_ID } from '../../utils/constants/headers';

export interface ApiClientConfig {
  headers?: Record<string, string>;
}

export class ApiClient {
  private readonly config: Config;
  private readonly executionContext: ExecutionContext;
  private readonly clientConfig: ApiClientConfig;
  private tokenManager: TokenManager;
  constructor(
    config: Config,
    executionContext: ExecutionContext,
    tokenManager: TokenManager,
    clientConfig: ApiClientConfig = {}
  ) {
    this.config = config;
    this.executionContext = executionContext;
    this.clientConfig = clientConfig;
    this.tokenManager = tokenManager;
  }

  /**
   * Gets a valid authentication token, refreshing if necessary.
   * Used internally for API requests and exposed for services that need manual auth headers.
   *
   * @returns The valid token
   * @throws AuthenticationError if no token available or refresh fails
   */
  public async getValidToken(): Promise<string> {
    return this.tokenManager.getValidToken();
  }

  private async getDefaultHeaders(): Promise<Record<string, string>> {
    const token = await this.getValidToken();

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': CONTENT_TYPES.JSON,
      ...this.clientConfig.headers
    };
  }


  private async request<T>(method: string, path: string, options: RequestSpec = {}): Promise<T> {
    // Ensure path starts with a forward slash
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    
    // Construct URL with org and tenant names
    const url = new URL(
      `${this.config.orgName}/${this.config.tenantName}/${normalizedPath}`,
      this.config.baseUrl
    ).toString();

    const isFormData = options.body instanceof FormData;
    const defaultHeaders = await this.getDefaultHeaders();
    if (isFormData) {
      delete defaultHeaders['Content-Type'];
    }

    const traceId = crypto.randomUUID().replace(/-/g, '');
    const spanId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const traceparentValue = `00-${traceId}-${spanId}-01`;

    const headers: Record<string, string> = {
      ...defaultHeaders,
      [TRACEPARENT]: traceparentValue,
      [UIPATH_TRACEPARENT_ID]: traceparentValue,
      ...options.headers
    };

    // Convert params to URLSearchParams
    const searchParams = new URLSearchParams();
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]: [string, any]) => {
        // Array values are serialized as repeated params (key=a&key=b) rather than a
        // single comma-joined value, which APIs expecting a collection reject.
        if (Array.isArray(value)) {
          value.forEach((item) => searchParams.append(key, String(item)));
        } else {
          searchParams.append(key, String(value));
        }
      });
    }
    const fullUrl = searchParams.toString() ? `${url}?${searchParams.toString()}` : url;

    let body = undefined;
    if (options.body) {
      if (isFormData) {
        body = options.body as FormData;
      } else if (options.bodyOptions?.stringify === false) {
        body = options.body as string;
      } else {
        body = JSON.stringify(options.body);
      }
    }

    try {
      const response = await fetch(fullUrl, {
        method,
        headers,
        body,
        signal: options.signal
      });

      if (!response.ok) {
        const errorInfo = await errorResponseParser.parse(response);
        throw ErrorFactory.createFromHttpStatus(response.status, errorInfo);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      // Handle blob response type for binary data (e.g., file downloads)
      if (options.responseType === RESPONSE_TYPES.BLOB) {
        const blob = await response.blob();
        return blob as T;
      }

      // Check if we're expecting XML
      const acceptHeader = headers['Accept'] || headers['accept'];
      if (acceptHeader === CONTENT_TYPES.XML) {
        const text = await response.text();
        return text as T;
      }

      const text = await response.text();
      if (!text) {
        return undefined as T;
      }
      if (options.responseType === RESPONSE_TYPES.TEXT) {
        return text as T;
      }
      try {
        return JSON.parse(text);
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new ServerError({
            message: `Server returned non-JSON response (${response.status} ${response.url}): ${error.message}`,
            statusCode: response.status,
          });
        }
        throw error;
      }
    } catch (error: any) {
      // If it's already one of our errors, re-throw it
      if (error.type && error.type.includes('Error')) {
        throw error;
      }

      // Otherwise, it's a genuine network/fetch failure
      throw ErrorFactory.createNetworkError(error);
    }

  }

  async get<T>(path: string, options: RequestSpec = {}): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  async post<T>(path: string, data?: unknown, options: RequestSpec = {}): Promise<T> {
    return this.request<T>('POST', path, { ...options, body: data });
  }

  async put<T>(path: string, data?: unknown, options: RequestSpec = {}): Promise<T> {
    return this.request<T>('PUT', path, { ...options, body: data });
  }

  async patch<T>(path: string, data?: unknown, options: RequestSpec = {}): Promise<T> {
    return this.request<T>('PATCH', path, { ...options, body: data });
  }

  async delete<T>(path: string, options: RequestSpec = {}): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }
}
