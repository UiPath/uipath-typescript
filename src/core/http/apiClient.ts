import { Config } from '../config/config';
import { ExecutionContext } from '../context/executionContext';
import { RequestSpec } from '../../models/common/requestSpec';

export interface ApiClientConfig {
  headers?: Record<string, string>;
}

export class ApiClient {
  private readonly config: Config;
  private readonly executionContext: ExecutionContext;
  private readonly clientConfig: ApiClientConfig;
  private defaultHeaders: Record<string, string> = {};

  constructor(config: Config, executionContext: ExecutionContext, clientConfig: ApiClientConfig = {}) {
    this.config = config;
    this.executionContext = executionContext;
    this.clientConfig = clientConfig;

  }

  public setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  private getDefaultHeaders(): Record<string, string> {
    // Get headers from execution context first
    let headers: Record<string, string> = {
      ...this.executionContext.getHeaders(),
      'Authorization': `Bearer ${this.executionContext.get('token') || this.config.secret}`,
      'Content-Type': 'application/json',
      ...this.defaultHeaders
    };

    // Add custom headers if available
    if (this.clientConfig.headers) {
      headers = { ...headers, ...this.clientConfig.headers };
    }

    return headers;
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
      ...this.getDefaultHeaders(),
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

    const response = await fetch(fullUrl, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
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
