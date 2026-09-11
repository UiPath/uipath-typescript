import { BaseService } from '../../base';
import { track } from '../../../core/telemetry';
import { ValidationError } from '../../../core/errors';
import { resolveFolderScope } from '../folder-scope';
import { CONNECTOR_ENDPOINTS } from '../../../utils/constants/endpoints';
import { QueryParams } from '../../../models/common/request-spec';
import {
  RawConnectorGetResponse,
  ConnectorGetAllOptions,
  ConnectorGetDefaultConnectionOptions,
  ConnectorGetConnectionsOptions,
} from '../../../models/integration-service/connectors.types';
import {
  ConnectorGetResponse,
  ConnectorsServiceModel,
} from '../../../models/integration-service/connectors.models';
import {
  ConnectionGetResponse,
  ConnectionsServiceModel,
  createConnectionWithMethods,
} from '../../../models/integration-service/connections.models';
import { RawConnectionGetResponse } from '../../../models/integration-service/connections.types';
import { ConnectionsService } from '../connections/connections';
import type { IUiPath } from '../../../core/types';

/**
 * Service for inspecting UiPath Integration Service connectors.
 *
 * Connectors are the catalog of integrations available on a tenant (Slack,
 * Microsoft 365, Salesforce, custom connectors, ...). Use this service to
 * discover connectors, fetch their metadata, and list / locate the connection
 * instances built on top of them.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Connectors } from '@uipath/uipath-typescript/connections';
 *
 * const connectors = new Connectors(sdk);
 * const allConnectors = await connectors.getAll();
 * ```
 */
export class ConnectorsService extends BaseService implements ConnectorsServiceModel {
  private connectionsService: ConnectionsServiceModel;

  /**
   * Creates an instance of the Connectors service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   */
  constructor(instance: IUiPath) {
    super(instance);
    this.connectionsService = new ConnectionsService(instance);
  }

  @track('Connectors.GetAll')
  async getAll(options?: ConnectorGetAllOptions): Promise<ConnectorGetResponse[]> {
    const response = await this.get<RawConnectorGetResponse[]>(CONNECTOR_ENDPOINTS.GET_ALL, {
      params: options as QueryParams | undefined,
    });
    return response.data ?? [];
  }

  @track('Connectors.GetById')
  async getById(keyOrId: string): Promise<ConnectorGetResponse> {
    if (!keyOrId) {
      throw new ValidationError({ message: 'keyOrId is required for getById' });
    }
    const response = await this.get<RawConnectorGetResponse>(CONNECTOR_ENDPOINTS.GET_BY_ID(keyOrId));
    return response.data;
  }

  @track('Connectors.GetDefaultConnection')
  async getDefaultConnection(
    keyOrId: string,
    options?: ConnectorGetDefaultConnectionOptions,
  ): Promise<ConnectionGetResponse> {
    if (!keyOrId) {
      throw new ValidationError({ message: 'keyOrId is required for getDefaultConnection' });
    }
    const { headers, queryOptions } = resolveFolderScope(
      options ?? {},
      'Connectors.getDefaultConnection',
      this.config.folderKey,
    );
    const response = await this.get<RawConnectionGetResponse>(
      CONNECTOR_ENDPOINTS.GET_DEFAULT_CONNECTION(keyOrId),
      {
        headers,
        params: queryOptions as QueryParams,
      },
    );
    return createConnectionWithMethods(response.data, this.connectionsService);
  }

  @track('Connectors.GetConnections')
  async getConnections(
    keyOrId: string,
    options?: ConnectorGetConnectionsOptions,
  ): Promise<ConnectionGetResponse[]> {
    if (!keyOrId) {
      throw new ValidationError({ message: 'keyOrId is required for getConnections' });
    }
    const { headers, queryOptions } = resolveFolderScope(
      options ?? {},
      'Connectors.getConnections',
      this.config.folderKey,
    );
    const response = await this.get<RawConnectionGetResponse[]>(
      CONNECTOR_ENDPOINTS.GET_CONNECTIONS(keyOrId),
      {
        headers,
        params: queryOptions as QueryParams,
      },
    );
    return (response.data ?? []).map((conn) => createConnectionWithMethods(conn, this.connectionsService));
  }
}
