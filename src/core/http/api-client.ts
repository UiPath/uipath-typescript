import { Config } from '../config/config';
import { ExecutionContext } from '../context/execution';
import { RequestSpec } from '../../models/common/request-spec';
import { TokenManager } from '../auth/token-manager';
import { errorResponseParser } from '../errors/parser';
import { ErrorFactory } from '../errors/error-factory';
import { CONTENT_TYPES } from '../../utils/constants/headers';

export interface ApiClientConfig {
  headers?: Record<string, string>;
}

export class ApiClient {
  private readonly config: Config;
  private readonly executionContext: ExecutionContext;
  private readonly clientConfig: ApiClientConfig;
  private defaultHeaders: Record<string, string> = {};
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

  public setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
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
    // Get headers from execution context first
    const contextHeaders = this.executionContext.getHeaders();
    
    // If Authorization header is already set in context, use that
    if (contextHeaders['Authorization']) {
      return {
        ...contextHeaders,
        'Content-Type': CONTENT_TYPES.JSON,
        ...this.defaultHeaders,
        ...this.clientConfig.headers
      };
    }

    const token = await this.getValidToken();

    return {
      ...contextHeaders,
      'Authorization': `Bearer ${token}`,
      'Content-Type': CONTENT_TYPES.JSON,
      ...this.defaultHeaders,
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

    const headers = {
      ...await this.getDefaultHeaders(),
      ...options.headers
    };

    // Convert params to URLSearchParams
    const searchParams = new URLSearchParams();
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]: [string, any]) => {
        searchParams.append(key, value.toString());
      });
    }
    const fullUrl = searchParams.toString() ? `${url}?${searchParams.toString()}` : url;

    try {
      const response = await fetch(fullUrl, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: options.signal
      });

      if (!response.ok) {
        const errorInfo = await errorResponseParser.parse(response);
        throw ErrorFactory.createFromHttpStatus(response.status, errorInfo);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      // Check if we're expecting XML
      const acceptHeader = headers['Accept'] || headers['accept'];
      if (acceptHeader === CONTENT_TYPES.XML) {
        const text = await response.text();
        return text as T;
      }

      return response.json();
    } catch (error: any) {
      // If it's already one of our errors, re-throw it
      if (error.type && error.type.includes('Error')) {
        throw error;
      }
      
      // Otherwise, it's likely a network error
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
