"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionsService = void 0;
const baseService_1 = require("./baseService");
class ConnectionsService extends baseService_1.BaseService {
    constructor(config, executionContext) {
        super(config, executionContext);
    }
    /**
     * Retrieve connection details by its key.
     *
     * This method fetches the configuration and metadata for a connection,
     * which can be used to establish communication with an external service.
     *
     * @param key - The unique identifier of the connection to retrieve
     * @returns A promise that resolves to the connection details
     */
    async retrieve(key) {
        const { method, url } = this.getRetrieveConfig(key);
        const response = await this.request(method, url);
        return response.data;
    }
    /**
     * Retrieve an authentication token for a connection.
     *
     * This method obtains a fresh authentication token that can be used to
     * communicate with the external service. This is particularly useful for
     * services that use token-based authentication.
     *
     * @param key - The unique identifier of the connection
     * @returns A promise that resolves to the authentication token details
     */
    async retrieveToken(key) {
        const { method, url, params } = this.getRetrieveTokenConfig(key);
        const response = await this.request(method, url, { params });
        return response.data;
    }
    getRetrieveConfig(key) {
        return {
            method: 'GET',
            url: `/connections_/api/v1/Connections/${key}`,
        };
    }
    getRetrieveTokenConfig(key) {
        return {
            method: 'GET',
            url: `/connections_/api/v1/Connections/${key}/token`,
            params: { type: 'direct' },
        };
    }
}
exports.ConnectionsService = ConnectionsService;
