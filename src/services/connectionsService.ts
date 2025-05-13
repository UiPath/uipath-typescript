import { Config } from '../config';
import { ExecutionContext } from '../executionContext';
import { BaseService } from './baseService';
import { Connection, ConnectionToken } from '../models/connection';

interface RequestConfig {
  method: string;
  url: string;
  params?: Record<string, string | number>;
  headers?: Record<string, string>;
}

export class ConnectionsService extends BaseService {
  constructor(config: Config, executionContext: ExecutionContext) {
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
  async retrieve(key: string): Promise<Connection> {
    const { method, url } = this.getRetrieveConfig(key);
    const response = await this.request<Connection>(method, url);
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
  async retrieveToken(key: string): Promise<ConnectionToken> {
    const { method, url, params } = this.getRetrieveTokenConfig(key);
    const response = await this.request<ConnectionToken>(method, url, { params });
    return response.data;
  }

  private getRetrieveConfig(key: string): RequestConfig {
    return {
      method: 'GET',
      url: `/connections_/api/v1/Connections/${key}`,
    };
  }

  private getRetrieveTokenConfig(key: string): RequestConfig {
    return {
      method: 'GET',
      url: `/connections_/api/v1/Connections/${key}/token`,
      params: { type: 'direct' },
    };
  }
} 