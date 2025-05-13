import { AxiosResponse } from 'axios';
import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { RequestSpec } from '../models/requestSpec';
export declare class BaseService {
    protected readonly config: Config;
    protected readonly executionContext: ExecutionContext;
    private readonly apiClient;
    constructor(config: Config, executionContext: ExecutionContext);
    /**
     * Makes an HTTP request using the configured API client.
     *
     * @param method - The HTTP method to use
     * @param url - The URL to send the request to
     * @param options - Additional request options
     * @returns A promise that resolves to the response data
     */
    protected request<T>(method: string, url: string, options?: Omit<RequestSpec, 'method' | 'url'>): Promise<AxiosResponse<T>>;
    /**
     * Makes an HTTP request using a RequestSpec object.
     *
     * @param spec - The request specification
     * @returns A promise that resolves to the response data
     */
    protected requestWithSpec<T>(spec: RequestSpec): Promise<AxiosResponse<T>>;
}
