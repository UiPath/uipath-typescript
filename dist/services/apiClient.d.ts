import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
export declare class ApiClient {
    private readonly config;
    private readonly executionContext;
    private readonly tenantScopeClient;
    private readonly orgScopeClient;
    private folderContext;
    constructor(config: Config, executionContext: ExecutionContext);
    /**
     * Makes an HTTP request using the tenant scope client.
     */
    request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * Makes an HTTP request using the org scope client.
     */
    requestOrgScope<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    private get defaultHeaders();
    /**
     * Normalizes a URL path by:
     * - Adding a leading slash if missing
     * - Removing trailing slashes (except for root '/')
     * - Stripping query parameters
     */
    private normalizeUrl;
    private getOrgScopeBaseUrl;
    private getFolderHeaders;
}
