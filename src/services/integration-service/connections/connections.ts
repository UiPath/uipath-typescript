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
  ConnectionReauthenticateOptions,
  ConnectionReauthenticateResponse,
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
 * import { Connections } from '@uipath/uipath-typescript/is-connections';
 *
 * const connections = new Connections(sdk);
 * const allConnections = await connections.getAll();
 * ```
 */
export class ConnectionsService extends BaseService implements ConnectionsServiceModel {
  /**
   * Get all connections, optionally scoped to a folder.
   *
   * Returns a plain array of connection entities. Pagination is page-indexed
   * via `pageIndex`/`pageSize`; there is no continuation cursor, so callers
   * paginate by incrementing `pageIndex` until a short page is returned.
   *
   * Folder scoping is optional — pass `folderId`, `folderKey`, or `folderPath`
   * to narrow the query. When none is supplied, the folder context the SDK was
   * initialized with is used; without one the query spans every folder the
   * caller can access.
   *
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`), paging, sorting, and filter options
   * @returns Promise resolving to an array of {@link ConnectionGetResponse}
   * @example
   * ```typescript
   * import { Connections } from '@uipath/uipath-typescript/is-connections';
   *
   * const connections = new Connections(sdk);
   *
   * // List the first page of connections in a folder
   * const folderConnections = await connections.getAll({
   *   folderKey: '<folderKey>',
   *   pageSize: 50,
   * });
   *
   * for (const conn of folderConnections) {
   *   console.log(`${conn.name} (${conn.state})`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Filter by name and connector
   * const filtered = await connections.getAll({
   *   folderKey: '<folderKey>',
   *   filter: "connector.key eq 'uipath-slack'",
   *   mostRecentFirst: true,
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Scope by folder path or numeric folder ID instead of a key
   * const byPath = await connections.getAll({ folderPath: 'Shared/Finance' });
   * const byId = await connections.getAll({ folderId: 123 });
   *
   * // Or span every folder the caller can access
   * const everywhere = await connections.getAll({ allFolders: true });
   * ```
   */
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

  /**
   * Get a single connection by ID.
   *
   * @param connectionId - Connection GUID
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional `includeConfigs` flag
   * @returns Promise resolving to a {@link ConnectionGetResponse}
   * @example
   * ```typescript
   * import { Connections } from '@uipath/uipath-typescript/is-connections';
   *
   * const connections = new Connections(sdk);
   *
   * // First, list connections to find the connectionId
   * const list = await connections.getAll({ folderKey: '<folderKey>' });
   * const connectionId = list[0].id;
   *
   * const conn = await connections.getById(connectionId);
   * console.log(conn.connector?.key, conn.state);
   * ```
   *
   * @example
   * ```typescript
   * // Include the full configuration blob
   * const conn = await connections.getById('<connectionId>', { includeConfigs: true });
   * ```
   *
   * @example
   * ```typescript
   * // Scope the lookup to a folder path
   * const conn = await connections.getById('<connectionId>', { folderPath: 'Shared/Finance' });
   * ```
   */
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

  /**
   * Check whether a connection is currently active.
   *
   * Returns the resolved state plus an optional error message. Use this before
   * invoking activities to surface a friendly error when the connection has
   * expired or been disabled.
   *
   * @param connectionId - Connection GUID
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and `forceRefresh` flag
   * @returns Promise resolving to a {@link ConnectionPingResponse}
   * @example
   * ```typescript
   * import { Connections, ConnectionState } from '@uipath/uipath-typescript/is-connections';
   *
   * const connections = new Connections(sdk);
   *
   * const status = await connections.ping('<connectionId>');
   * if (status.status !== ConnectionState.Enabled) {
   *   console.warn(`Connection unhealthy: ${status.status} — ${status.error ?? 'no detail'}`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Skip cache and force a live re-validation
   * const status = await connections.ping('<connectionId>', { forceRefresh: true });
   * ```
   */
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

  /**
   * Start an OAuth re-authentication session for a connection.
   *
   * Returns a session handle plus the URL the end user must visit to grant or
   * refresh consent. The session expires at {@link ConnectionReauthenticateResponse.expiresAt}.
   *
   * @param connectionId - Connection GUID
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`)
   * @returns Promise resolving to a {@link ConnectionReauthenticateResponse}
   * @example
   * ```typescript
   * import { Connections } from '@uipath/uipath-typescript/is-connections';
   *
   * const connections = new Connections(sdk);
   *
   * const session = await connections.reauthenticate('<connectionId>');
   * // Direct the user to session.authUrl to complete OAuth consent.
   * console.log(`Visit: ${session.authUrl}`);
   * ```
   */
  @track('Connections.Reauthenticate')
  async reauthenticate(
    connectionId: string,
    options?: ConnectionReauthenticateOptions,
  ): Promise<ConnectionReauthenticateResponse> {
    if (!connectionId) {
      throw new ValidationError({ message: 'connectionId is required for reauthenticate' });
    }
    const { headers, queryOptions } = resolveFolderScope(
      options ?? {},
      'Connections.reauthenticate',
      this.config.folderKey,
    );
    const response = await this.post<ConnectionReauthenticateResponse>(
      CONNECTION_ENDPOINTS.REAUTHENTICATE(connectionId),
      undefined,
      {
        headers,
        params: queryOptions as QueryParams,
      },
    );
    return response.data;
  }
}
