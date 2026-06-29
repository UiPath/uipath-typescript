import { BaseService } from '../../base';
import { track } from '../../../core/telemetry';
import { ValidationError } from '../../../core/errors';
import { createHeaders } from '../../../utils/http/headers';
import { FOLDER_KEY } from '../../../utils/constants/headers';
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
 * import { Connectors } from '@uipath/uipath-typescript/is-connectors';
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

  /**
   * List all connectors available on this tenant.
   *
   * Returns a plain array — the Integration Service does not paginate this endpoint.
   *
   * @param options - Optional filter (e.g. limit to connectors exposing HTTP Request activities)
   * @returns Promise resolving to an array of {@link ConnectorGetResponse}
   * @example
   * ```typescript
   * import { Connectors } from '@uipath/uipath-typescript/is-connectors';
   *
   * const connectors = new Connectors(sdk);
   *
   * const all = await connectors.getAll();
   * for (const connector of all) {
   *   console.log(`${connector.key} — ${connector.name} (${connector.lifeCycleStage})`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Only connectors that expose an HTTP Request activity
   * const httpEnabled = await connectors.getAll({ hasHttpRequest: true });
   * ```
   */
  @track('Connectors.GetAll')
  async getAll(options?: ConnectorGetAllOptions): Promise<ConnectorGetResponse[]> {
    const response = await this.get<RawConnectorGetResponse[]>(CONNECTOR_ENDPOINTS.GET_ALL, {
      params: options as QueryParams | undefined,
    });
    return response.data ?? [];
  }

  /**
   * Get a single connector by key or numeric ID.
   *
   * @param keyOrId - Connector key (e.g. `uipath-slack`) or numeric ID as a string
   * @returns Promise resolving to a {@link ConnectorGetResponse}
   * @example
   * ```typescript
   * import { Connectors } from '@uipath/uipath-typescript/is-connectors';
   *
   * const connectors = new Connectors(sdk);
   *
   * const slack = await connectors.getById('uipath-slack');
   * console.log(slack.name, slack.authentication?.type);
   * ```
   */
  @track('Connectors.GetById')
  async getById(keyOrId: string): Promise<ConnectorGetResponse> {
    if (!keyOrId) {
      throw new ValidationError({ message: 'keyOrId is required for getById' });
    }
    const response = await this.get<RawConnectorGetResponse>(CONNECTOR_ENDPOINTS.GET_BY_ID(keyOrId));
    return response.data;
  }

  /**
   * Get the default connection for a connector in the current folder.
   *
   * Each connector may have a single connection marked as default per folder;
   * use this to resolve "which connection should I use for Slack?" without
   * paging through the full list.
   *
   * @param keyOrId - Connector key or numeric ID as a string
   * @param options - Folder scoping options
   * @returns Promise resolving to a {@link ConnectionGetResponse}
   * @example
   * ```typescript
   * import { Connectors } from '@uipath/uipath-typescript/is-connectors';
   *
   * const connectors = new Connectors(sdk);
   *
   * const defaultSlack = await connectors.getDefaultConnection('uipath-slack', {
   *   folderKey: '<folderKey>',
   * });
   *
   * // Use bound methods directly on the entity
   * const status = await defaultSlack.ping();
   * console.log(status.status);
   * ```
   */
  @track('Connectors.GetDefaultConnection')
  async getDefaultConnection(
    keyOrId: string,
    options?: ConnectorGetDefaultConnectionOptions,
  ): Promise<ConnectionGetResponse> {
    if (!keyOrId) {
      throw new ValidationError({ message: 'keyOrId is required for getDefaultConnection' });
    }
    const { folderKey, ...queryOptions } = options ?? {};
    const response = await this.get<RawConnectionGetResponse>(
      CONNECTOR_ENDPOINTS.GET_DEFAULT_CONNECTION(keyOrId),
      {
        headers: createHeaders({ [FOLDER_KEY]: folderKey }),
        params: queryOptions as QueryParams,
      },
    );
    return createConnectionWithMethods(response.data, this.connectionsService);
  }

  /**
   * List all connections for a connector.
   *
   * Returns a plain array — the Integration Service uses page-indexed
   * pagination (no continuation cursor). Increment `pageIndex` to walk pages.
   *
   * @param keyOrId - Connector key or numeric ID as a string
   * @param options - Folder scoping, paging, and sorting options
   * @returns Promise resolving to an array of {@link ConnectionGetResponse}
   * @example
   * ```typescript
   * import { Connectors } from '@uipath/uipath-typescript/is-connectors';
   *
   * const connectors = new Connectors(sdk);
   *
   * // First page of Slack connections in a folder
   * const slackConnections = await connectors.getConnections('uipath-slack', {
   *   folderKey: '<folderKey>',
   *   pageSize: 25,
   * });
   *
   * for (const conn of slackConnections) {
   *   const status = await conn.ping();
   *   console.log(`${conn.name}: ${status.status}`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Walk subsequent pages
   * const page2 = await connectors.getConnections('uipath-slack', {
   *   folderKey: '<folderKey>',
   *   pageSize: 25,
   *   pageIndex: 2,
   * });
   * ```
   */
  @track('Connectors.GetConnections')
  async getConnections(
    keyOrId: string,
    options?: ConnectorGetConnectionsOptions,
  ): Promise<ConnectionGetResponse[]> {
    if (!keyOrId) {
      throw new ValidationError({ message: 'keyOrId is required for getConnections' });
    }
    const { folderKey, ...queryOptions } = options ?? {};
    const response = await this.get<RawConnectionGetResponse[]>(
      CONNECTOR_ENDPOINTS.GET_CONNECTIONS(keyOrId),
      {
        headers: createHeaders({ [FOLDER_KEY]: folderKey }),
        params: queryOptions as QueryParams,
      },
    );
    return (response.data ?? []).map((conn) => createConnectionWithMethods(conn, this.connectionsService));
  }
}
