import { ApiClient } from '../core/http/apiClient';
import { Config } from '../core/config/config';
import { ExecutionContext } from '../core/context/executionContext';
import { RequestSpec } from '../models/common/requestSpec';

export interface ApiResponse<T> {
  data: T;
}

export class BaseService {
  protected readonly config: Config;
  protected readonly executionContext: ExecutionContext;
  protected readonly apiClient: ApiClient;

  constructor(config: Config, executionContext: ExecutionContext) {
    this.config = config;
    this.executionContext = executionContext;
    this.apiClient = new ApiClient(config, executionContext);
  }

  protected async request<T>(method: string, path: string, options: RequestSpec = {}): Promise<ApiResponse<T>> {
    switch (method.toUpperCase()) {
      case 'GET':
        return this.get<T>(path, options);
      case 'POST':
        return this.post<T>(path, options.body, options);
      case 'PUT':
        return this.put<T>(path, options.body, options);
      case 'PATCH':
        return this.patch<T>(path, options.body, options);
      case 'DELETE':
        return this.delete<T>(path, options);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  protected async requestWithSpec<T>(spec: RequestSpec): Promise<ApiResponse<T>> {
    if (!spec.method || !spec.url) {
      throw new Error('Request spec must include method and url');
    }
    return this.request<T>(spec.method, spec.url, spec);
  }

  protected async get<T>(path: string, options: RequestSpec = {}): Promise<ApiResponse<T>> {
    const response = await this.apiClient.get<T>(path, options);
    return { data: response };
  }

  protected async post<T>(path: string, data?: unknown, options: RequestSpec = {}): Promise<ApiResponse<T>> {
    const response = await this.apiClient.post<T>(path, data, options);
    return { data: response };
  }

  protected async put<T>(path: string, data?: unknown, options: RequestSpec = {}): Promise<ApiResponse<T>> {
    const response = await this.apiClient.put<T>(path, data, options);
    return { data: response };
  }

  protected async patch<T>(path: string, data?: unknown, options: RequestSpec = {}): Promise<ApiResponse<T>> {
    const response = await this.apiClient.patch<T>(path, data, options);
    return { data: response };
  }

  protected async delete<T>(path: string, options: RequestSpec = {}): Promise<ApiResponse<T>> {
    const response = await this.apiClient.delete<T>(path, options);
    return { data: response };
  }
}
