import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { ApiClient } from './apiClient';
import { RequestSpec } from '../models/requestSpec';
import { logger } from '../utils/logger';

export class BaseService {
  protected readonly config: Config;
  protected readonly executionContext: ExecutionContext;
  private readonly apiClient: ApiClient;

  constructor(config: Config, executionContext: ExecutionContext) {
    this.config = config;
    this.executionContext = executionContext;
    this.apiClient = new ApiClient(config, executionContext);
  }

  /**
   * Makes an HTTP request using the configured API client.
   * 
   * @param method - The HTTP method to use
   * @param url - The URL to send the request to
   * @param options - Additional request options
   * @returns A promise that resolves to the response data
   */
  protected async request<T>(
    method: string,
    url: string,
    options?: Omit<RequestSpec, 'method' | 'url'>
  ): Promise<AxiosResponse<T>> {
    const config: AxiosRequestConfig = {
      method,
      url,
      ...options,
    };

    logger.debug('Making request', { method, url, options });
    return this.apiClient.request<T>(config);

  }

  /**
   * Makes an HTTP request using a RequestSpec object.
   * 
   * @param spec - The request specification
   * @returns A promise that resolves to the response data
   */
  protected async requestWithSpec<T>(spec: RequestSpec): Promise<AxiosResponse<T>> {
    const { method, url, ...options } = spec;
    return this.request<T>(method, url, options);
  }
}
