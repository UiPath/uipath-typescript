import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { BaseService } from './baseService';
import { Connection, ConnectionToken } from '../models/connection';
export declare class ConnectionsService extends BaseService {
    constructor(config: Config, executionContext: ExecutionContext);
    /**
     * Retrieve connection details by its key.
     *
     * This method fetches the configuration and metadata for a connection,
     * which can be used to establish communication with an external service.
     *
     * @param key - The unique identifier of the connection to retrieve
     * @returns A promise that resolves to the connection details
     */
    retrieve(key: string): Promise<Connection>;
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
    retrieveToken(key: string): Promise<ConnectionToken>;
    private getRetrieveConfig;
    private getRetrieveTokenConfig;
}
