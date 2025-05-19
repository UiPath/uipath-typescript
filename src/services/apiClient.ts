import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { retry } from 'ts-retry-promise';
import { logger } from '../utils/logger';
import { FolderContext } from '../folderContext';
import { headerUserAgent } from '../utils/userAgent';
import { ENV, HEADERS } from '../utils/constants';

export class ApiClient {
  private readonly tenantScopeClient: AxiosInstance;
  private readonly orgScopeClient: AxiosInstance;
  private folderContext: FolderContext;

  constructor(private readonly config: Config, private readonly executionContext: ExecutionContext) {
    // Create tenant scope client
    this.tenantScopeClient = axios.create({
      baseURL: this.config.baseUrl,
      headers: this.defaultHeaders,
      timeout: 30000,
    });

    // Create org scope client
    this.orgScopeClient = axios.create({
      baseURL: this.getOrgScopeBaseUrl(),
      headers: this.defaultHeaders,
      timeout: 30000,
    });

    this.folderContext = new FolderContext(config, executionContext);
  }

  /**
   * Makes an HTTP request using the tenant scope client.
   */
  async request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const normalizedUrl = this.normalizeUrl(config.url || '');
    logger.debug(`Request: ${config.method} ${normalizedUrl}`);
    logger.debug('Headers:', { headers: config.headers || this.defaultHeaders });

    // Get the calling service and method name
    const stack = new Error().stack?.split('\n');
    let specificComponent = '';
    if (stack && stack.length > 2) {
      const callerLine = stack[3]; // Skip Error, request, and retry frames
      const match = callerLine.match(/at (\w+)\.(\w+)/);
      if (match) {
        specificComponent = `${match[1]}.${match[2]}`;
      }
    }

    return retry(
      async () => {
        try {
          return await this.tenantScopeClient.request<T>({
            ...config,
            url: normalizedUrl,
            headers: {
              ...config.headers,
              ...headerUserAgent(specificComponent)
            }
          });
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status && error.response.status >= 500) {
            logger.error('Request failed with server error', {
              status: error.response.status,
              url: normalizedUrl
            });
            throw error; // Will be retried
          }
          logger.error('Request failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            url: normalizedUrl
          });
          throw error; // Won't be retried
        }
      },
      {
        retries: 3,
        backoff: 'EXPONENTIAL',
        timeout: 30000,
      }
    );
  }

  /**
   * Makes an HTTP request using the org scope client.
   */
  async requestOrgScope<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const normalizedUrl = this.normalizeUrl(config.url || '');
    logger.debug(`Org Scope Request: ${config.method} ${normalizedUrl}`);
    logger.debug('Headers:', { headers: config.headers || this.defaultHeaders });

    // Get the calling service and method name
    const stack = new Error().stack?.split('\n');
    let specificComponent = '';
    if (stack && stack.length > 2) {
      const callerLine = stack[3]; // Skip Error, request, and retry frames
      const match = callerLine.match(/at (\w+)\.(\w+)/);
      if (match) {
        specificComponent = `${match[1]}.${match[2]}`;
      }
    }

    return retry(
      async () => {
        try {
          return await this.orgScopeClient.request<T>({
            ...config,
            url: normalizedUrl,
            headers: {
              ...config.headers,
              ...headerUserAgent(specificComponent)
            }
          });
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status && error.response.status >= 500) {
            logger.error('Org scope request failed with server error', {
              status: error.response.status,
              url: normalizedUrl
            });
            throw error; // Will be retried
          }
          logger.error('Org scope request failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            url: normalizedUrl
          });
          throw error; // Won't be retried
        }
      },
      {
        retries: 3,
        backoff: 'EXPONENTIAL',
        timeout: 30000,
      }
    );
  }

  private get defaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.secret}`,
      'Content-Type': 'application/json',
      ...headerUserAgent('ApiClient.defaultHeaders'),
    };

    // Add instance ID if available
    if (this.executionContext.instanceId) {
      headers[HEADERS.INSTANCE_ID] = this.executionContext.instanceId;
    }

    // Add tenant ID if available
    const tenantId = process.env[ENV.TENANT_ID];
    if (tenantId) {
      headers[HEADERS.TENANT_ID] = tenantId;
    }

    // Add organization ID if available
    const orgId = process.env[ENV.ORGANIZATION_ID];
    if (orgId) {
      headers[HEADERS.ORGANIZATION_UNIT_ID] = orgId;
    }

    return headers;
  }

  /**
   * Normalizes a URL path by:
   * - Adding a leading slash if missing
   * - Removing trailing slashes (except for root '/')
   * - Stripping query parameters
   */
  private normalizeUrl(url: string): string {
    let normalized = url.startsWith('/') ? url : `/${url}`;
    if (normalized !== '/' && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized.split('?')[0];
  }

  private getOrgScopeBaseUrl(): string {
    const url = new URL(this.config.baseUrl);
    const parts = url.pathname.split('/');
    if (parts.length >= 3) {
      parts.pop(); // Remove tenant
      return url.origin + parts.join('/');
    }
    return this.config.baseUrl;
  }

  private getFolderHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const folderPath = this.folderContext.folderPath;
    
    if (folderPath) {
      headers[HEADERS.FOLDER_PATH] = folderPath;
    }

    return headers;
  }
}
