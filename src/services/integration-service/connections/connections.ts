import { BaseService } from '../../base';
import { track } from '../../../core/telemetry';
import { resolveFolderScope } from '../folder-scope';
import { CONNECTION_ENDPOINTS } from '../../../utils/constants/endpoints';
import { QueryParams } from '../../../models/common/request-spec';
import {
  ConnectionGetAllOptions,
  ConnectionGetByIdOptions,
  ConnectionGetResponse,
} from '../../../models/integration-service/connections.types';
import { ConnectionsServiceModel } from '../../../models/integration-service/connections.models';
import type { ConnectionResource } from '@/resources';
import { resolveConnectionTarget, withConnectionFolder } from '../connection-target';

/**
 * Service for managing UiPath Integration Service connections.
 *
 * A connection represents an authenticated link to a third-party system (Salesforce,
 * Slack, OneDrive, ...) inside a UiPath folder. Use this service to list connections,
 * or inspect a single connection.
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
      this.config.metaFolderKey,
    );
    const response = await this.get<ConnectionGetResponse[]>(CONNECTION_ENDPOINTS.GET_ALL, {
      headers,
      params: queryOptions as QueryParams,
    });
    return response.data ?? [];
  }

  getById(connectionId: string, options?: ConnectionGetByIdOptions): Promise<ConnectionGetResponse>;
  getById(connection: ConnectionResource, options?: ConnectionGetByIdOptions): Promise<ConnectionGetResponse>;
  @track('Connections.GetById')
  async getById(
    connection: string | ConnectionResource,
    options?: ConnectionGetByIdOptions,
  ): Promise<ConnectionGetResponse> {
    const target = resolveConnectionTarget(connection, 'getById');
    const { headers, queryOptions } = resolveFolderScope(
      withConnectionFolder(options ?? {}, target),
      'Connections.getById',
      this.config.metaFolderKey,
    );
    const response = await this.get<ConnectionGetResponse>(CONNECTION_ENDPOINTS.GET_BY_ID(target.id), {
      headers,
      params: queryOptions as QueryParams,
    });
    return response.data;
  }

}
