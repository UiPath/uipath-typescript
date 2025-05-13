"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
const apiClient_1 = require("./apiClient");
const logger_1 = require("../utils/logger");
class BaseService {
    constructor(config, executionContext) {
        this.config = config;
        this.executionContext = executionContext;
        this.apiClient = new apiClient_1.ApiClient(config, executionContext);
    }
    /**
     * Makes an HTTP request using the configured API client.
     *
     * @param method - The HTTP method to use
     * @param url - The URL to send the request to
     * @param options - Additional request options
     * @returns A promise that resolves to the response data
     */
    async request(method, url, options) {
        const config = {
            method,
            url,
            ...options,
        };
        logger_1.logger.debug('Making request', { method, url, options });
        return this.apiClient.request(config);
    }
    /**
     * Makes an HTTP request using a RequestSpec object.
     *
     * @param spec - The request specification
     * @returns A promise that resolves to the response data
     */
    async requestWithSpec(spec) {
        const { method, url, ...options } = spec;
        return this.request(method, url, options);
    }
}
exports.BaseService = BaseService;
