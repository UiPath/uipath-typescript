import { Config } from '../config/config';
import { ExecutionContext } from '../context/execution-context';
import { RequestSpec } from '../../models/common/request-spec';
import { TokenManager } from '../auth/token-manager';
import { TokenInfo } from '../auth/auth.types';

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
   * Checks if the current token needs refresh and refreshes it if necessary
   * @returns The valid token
   * @throws Error if token refresh fails
   */
  private async ensureValidToken(): Promise<string> {
    // Try to get token info from context
    const tokenInfo = this.executionContext.get('tokenInfo') as TokenInfo | undefined;
    
    if (!tokenInfo) {
      throw new Error('No authentication token available. Make sure to initialize the SDK first.');
    }

    // For secret-based tokens, they never expire
    if (tokenInfo.type === 'secret') {
      return tokenInfo.token;
    }

    // If token is not expired, return it
    if (!this.tokenManager.isTokenExpired(tokenInfo)) {
      return tokenInfo.token;
    }

    try {
      const newToken = await this.tokenManager.refreshAccessToken();
      return newToken.access_token;
    } catch (error: any) {
      throw new Error(`Token refresh failed: ${error.message}. Please re-authenticate.`);
    }
  }

  private async _getDefaultHeaders(excludeContentType: boolean = false): Promise<Record<string, string>> {
    // Get headers from execution context first
    const contextHeaders = this.executionContext.getHeaders();
    
    // Base headers without Content-Type
    const baseHeaders: Record<string, string> = {
      ...contextHeaders,
      ...this.defaultHeaders,
      ...this.clientConfig.headers
    };

    // Add Content-Type only if not excluded (for FormData)
    if (!excludeContentType) {
      baseHeaders['Content-Type'] = 'application/json';
    }
    
    // If Authorization header is already set in context, use that
    if (contextHeaders['Authorization']) {
      return baseHeaders;
    }

    const token = await this.ensureValidToken();
    baseHeaders['Authorization'] = `Bearer ${token}`;

    return baseHeaders;
  }

  private _isFormDataBody(body: unknown): boolean {
    const anyBody = body as any;
    return (
      typeof FormData !== 'undefined' && body instanceof FormData
    ) || (
      anyBody && typeof anyBody === 'object' && typeof anyBody.getHeaders === 'function'
    );
  }

  private _buildUrl(path: string, params?: Record<string, any>): string {
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    const base = new URL(
      `${this.config.orgName}/${this.config.tenantName}/${normalizedPath}`,
      this.config.baseUrl
    ).toString();

    if (!params || Object.keys(params).length === 0) {
      return base;
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    return `${base}?${searchParams.toString()}`;
  }

  private _prepareRequestBody(body: unknown, isFormData: boolean): any {
    if (!body) {
      return undefined;
    }

    if (isFormData) {
      const formDataBody = body as any;
      if (typeof formDataBody.getBuffer === 'function') {
        // form-data package in Node.js
        // TODO: For large files (>100MB), consider using a different HTTP client that handles streams better
        return formDataBody.getBuffer();
      }
      return body;
    }

    return JSON.stringify(body);
  }

  private async request<T>(method: string, path: string, options: RequestSpec = {}): Promise<T> {
    const bodyAsAny = options.body as any;
    const isFormData = this._isFormDataBody(options.body);

    // Get headers, excluding Content-Type for FormData (browser sets it automatically with boundary)
    let headers = {
      ...await this._getDefaultHeaders(isFormData),
      ...options.headers
    };

    // If using form-data package (Node.js), merge its headers
    if (bodyAsAny && typeof bodyAsAny.getHeaders === 'function') {
      const formDataHeaders = bodyAsAny.getHeaders();
      headers = { ...headers, ...formDataHeaders };
    }

    const fullUrl = this._buildUrl(path, options.params);

    // Prepare body based on type
    const body: any = this._prepareRequestBody(options.body, isFormData);

    const response = await fetch(fullUrl, {
      method,
      headers,
      body,
      signal: options.signal
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`HTTP ${response.status}: ${error.message}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    // Check if we're expecting XML
    const acceptHeader = headers['Accept'] || headers['accept'];
    if (acceptHeader === 'application/xml') {
      const text = await response.text();
      return text as T;
    }

    return response.json();
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
