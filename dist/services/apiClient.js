"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = void 0;
const axios_1 = __importDefault(require("axios"));
const ts_retry_promise_1 = require("ts-retry-promise");
const logger_1 = require("../utils/logger");
const folderContext_1 = require("../folderContext");
const userAgent_1 = require("../utils/userAgent");
const constants_1 = require("../utils/constants");
class ApiClient {
    constructor(config, executionContext) {
        this.config = config;
        this.executionContext = executionContext;
        // Create tenant scope client
        this.tenantScopeClient = axios_1.default.create({
            baseURL: this.config.baseUrl,
            headers: this.defaultHeaders,
            timeout: 30000,
        });
        // Create org scope client
        this.orgScopeClient = axios_1.default.create({
            baseURL: this.getOrgScopeBaseUrl(),
            headers: this.defaultHeaders,
            timeout: 30000,
        });
        this.folderContext = new folderContext_1.FolderContext(config, executionContext);
    }
    /**
     * Makes an HTTP request using the tenant scope client.
     */
    async request(config) {
        const normalizedUrl = this.normalizeUrl(config.url || '');
        logger_1.logger.debug(`Request: ${config.method} ${normalizedUrl}`);
        logger_1.logger.debug('Headers:', { headers: config.headers || this.defaultHeaders });
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
        return (0, ts_retry_promise_1.retry)(async () => {
            try {
                return await this.tenantScopeClient.request({
                    ...config,
                    url: normalizedUrl,
                    headers: {
                        ...config.headers,
                        ...(0, userAgent_1.headerUserAgent)(specificComponent)
                    }
                });
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error) && error.response?.status && error.response.status >= 500) {
                    logger_1.logger.error('Request failed with server error', {
                        status: error.response.status,
                        url: normalizedUrl
                    });
                    throw error; // Will be retried
                }
                logger_1.logger.error('Request failed', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    url: normalizedUrl
                });
                throw error; // Won't be retried
            }
        }, {
            retries: 3,
            backoff: 'EXPONENTIAL',
            timeout: 30000,
        });
    }
    /**
     * Makes an HTTP request using the org scope client.
     */
    async requestOrgScope(config) {
        const normalizedUrl = this.normalizeUrl(config.url || '');
        logger_1.logger.debug(`Org Scope Request: ${config.method} ${normalizedUrl}`);
        logger_1.logger.debug('Headers:', { headers: config.headers || this.defaultHeaders });
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
        return (0, ts_retry_promise_1.retry)(async () => {
            try {
                return await this.orgScopeClient.request({
                    ...config,
                    url: normalizedUrl,
                    headers: {
                        ...config.headers,
                        ...(0, userAgent_1.headerUserAgent)(specificComponent)
                    }
                });
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error) && error.response?.status && error.response.status >= 500) {
                    logger_1.logger.error('Org scope request failed with server error', {
                        status: error.response.status,
                        url: normalizedUrl
                    });
                    throw error; // Will be retried
                }
                logger_1.logger.error('Org scope request failed', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    url: normalizedUrl
                });
                throw error; // Won't be retried
            }
        }, {
            retries: 3,
            backoff: 'EXPONENTIAL',
            timeout: 30000,
        });
    }
    get defaultHeaders() {
        const headers = {
            'Authorization': `Bearer ${this.config.secret}`,
            'Content-Type': 'application/json',
            ...(0, userAgent_1.headerUserAgent)('ApiClient.defaultHeaders'),
        };
        // Add organization unit ID if available
        if (this.executionContext.instanceId) {
            headers[constants_1.HEADERS.INSTANCE_ID] = this.executionContext.instanceId;
        }
        // Add tenant ID if available
        const tenantId = process.env[constants_1.ENV.TENANT_ID];
        if (tenantId) {
            headers[constants_1.HEADERS.TENANT_ID] = tenantId;
        }
        // Add organization ID if available
        const orgId = process.env[constants_1.ENV.ORGANIZATION_ID];
        if (orgId) {
            headers[constants_1.HEADERS.ORGANIZATION_UNIT_ID] = orgId;
        }
        return headers;
    }
    /**
     * Normalizes a URL path by:
     * - Adding a leading slash if missing
     * - Removing trailing slashes (except for root '/')
     * - Stripping query parameters
     */
    normalizeUrl(url) {
        let normalized = url.startsWith('/') ? url : `/${url}`;
        if (normalized !== '/' && normalized.endsWith('/')) {
            normalized = normalized.slice(0, -1);
        }
        return normalized.split('?')[0];
    }
    getOrgScopeBaseUrl() {
        const url = new URL(this.config.baseUrl);
        const parts = url.pathname.split('/');
        if (parts.length >= 3) {
            parts.pop(); // Remove tenant
            return url.origin + parts.join('/');
        }
        return this.config.baseUrl;
    }
    getFolderHeaders() {
        const headers = {};
        const folderPath = this.folderContext.folderPath;
        if (folderPath) {
            headers[constants_1.HEADERS.FOLDER_PATH] = folderPath;
        }
        return headers;
    }
}
exports.ApiClient = ApiClient;
