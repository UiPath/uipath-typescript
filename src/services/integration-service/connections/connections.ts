import { BaseService } from '../../base';
import { track } from '../../../core/telemetry';
import { ValidationError } from '../../../core/errors';
import { resolveFolderScope } from '../folder-scope';
import { CONNECTION_ENDPOINTS } from '../../../utils/constants/endpoints';
import { QueryParams } from '../../../models/common/request-spec';
import {
  ConnectionGetAllOptions,
  ConnectionGetByIdOptions,
  ConnectionPingOptions,
  ConnectionPingResponse,
  RawConnectionGetResponse,
} from '../../../models/integration-service/connections.types';
import {
  ConnectionGetResponse,
  ConnectionsServiceModel,
  createConnectionWithMethods,
} from '../../../models/integration-service/connections.models';

/**
 * Service for managing UiPath Integration Service connections.
 *
 * A connection represents an authenticated link to a third-party system (Salesforce,
 * Slack, OneDrive, ...) inside a UiPath folder. Use this service to list connections,
 * inspect a single connection, check connectivity, or trigger re-authentication.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Connections } from '@uipath/uipath-typescript/connections';
 *
 * const connections = new Connections(sdk);
 * const allConnections = await connections.getAll();
 * ```
 */
export class ConnectionsService extends BaseService implements ConnectionsServiceModel {
  @track('Connections.GetAll')
  async getAll(options?: ConnectionGetAllOptions): Promise<ConnectionGetResponse[]> {
    const { headers, queryOptions } = resolveFolderScope(
      options ?? {},
      'Connections.getAll',
      this.config.folderKey,
    );
    const response = await this.get<RawConnectionGetResponse[]>(CONNECTION_ENDPOINTS.GET_ALL, {
      headers,
      params: queryOptions as QueryParams,
    });
    return (response.data ?? []).map((conn) => createConnectionWithMethods(conn, this));
  }

  @track('Connections.GetById')
  async getById(connectionId: string, options?: ConnectionGetByIdOptions): Promise<ConnectionGetResponse> {
    if (!connectionId) {
      throw new ValidationError({ message: 'connectionId is required for getById' });
    }
    const { headers, queryOptions } = resolveFolderScope(
      options ?? {},
      'Connections.getById',
      this.config.folderKey,
    );
    const response = await this.get<RawConnectionGetResponse>(CONNECTION_ENDPOINTS.GET_BY_ID(connectionId), {
      headers,
      params: queryOptions as QueryParams,
    });
    return createConnectionWithMethods(response.data, this);
  }

  @track('Connections.Ping')
  async ping(connectionId: string, options?: ConnectionPingOptions): Promise<ConnectionPingResponse> {
    if (!connectionId) {
      throw new ValidationError({ message: 'connectionId is required for ping' });
    }
    const { headers, queryOptions } = resolveFolderScope(
      options ?? {},
      'Connections.ping',
      this.config.folderKey,
    );
    const response = await this.get<ConnectionPingResponse>(CONNECTION_ENDPOINTS.PING(connectionId), {
      headers,
      params: queryOptions as QueryParams,
    });
    return response.data;
  }

}
