/**
 * Integration Service — Connection models
 *
 * Combines raw connection data with bound entity methods (`ping`, `reauthenticate`).
 */

import {
  RawConnectionGetResponse,
  ConnectionGetAllOptions,
  ConnectionGetByIdOptions,
  ConnectionPingOptions,
  ConnectionPingResponse,
  ConnectionReauthenticateOptions,
  ConnectionReauthenticateResponse,
} from './connections.types';

/**
 * A Connection entity enriched with bound methods.
 *
 * Returned by every Connection-yielding method on the {@link ConnectionsServiceModel}
 * and {@link ConnectorsServiceModel}. The bound methods (`ping`, `reauthenticate`)
 * close over this connection's ID so callers can act on the entity directly.
 */
export type ConnectionGetResponse = RawConnectionGetResponse & ConnectionMethods;

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
export interface ConnectionsServiceModel {
  /**
   * Get all connections, optionally scoped to a folder.
   *
   * Returns a plain array of connection entities. Pagination is page-indexed
   * via `pageIndex`/`pageSize`; there is no continuation cursor, so callers
   * paginate by incrementing `pageIndex` until a short page is returned.
   *
   * @param options - Folder scoping, paging, sorting, and filter options
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
   */
  getAll(options?: ConnectionGetAllOptions): Promise<ConnectionGetResponse[]>;

  /**
   * Get a single connection by ID.
   *
   * @param connectionId - Connection GUID
   * @param options - Folder scoping and optional `includeConfigs` flag
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
   */
  getById(connectionId: string, options?: ConnectionGetByIdOptions): Promise<ConnectionGetResponse>;

  /**
   * Check whether a connection is currently active.
   *
   * Returns the resolved state plus an optional error message. Use this before
   * invoking activities to surface a friendly error when the connection has
   * expired or been disabled.
   *
   * @param connectionId - Connection GUID
   * @param options - Folder scoping and `forceRefresh` flag
   * @returns Promise resolving to a {@link ConnectionPingResponse}
   * @example
   * ```typescript
   * import { Connections } from '@uipath/uipath-typescript/is-connections';
   *
   * const connections = new Connections(sdk);
   *
   * const status = await connections.ping('<connectionId>');
   * if (status.status !== 'Enabled') {
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
  ping(connectionId: string, options?: ConnectionPingOptions): Promise<ConnectionPingResponse>;

  /**
   * Start an OAuth re-authentication session for a connection.
   *
   * Returns a session handle plus the URL the end user must visit to grant or
   * refresh consent. The session expires at {@link ConnectionReauthenticateResponse.expiresAt}.
   *
   * @param connectionId - Connection GUID
   * @param options - Folder scoping options
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
  reauthenticate(
    connectionId: string,
    options?: ConnectionReauthenticateOptions,
  ): Promise<ConnectionReauthenticateResponse>;
}

/**
 * Methods bound onto every {@link ConnectionGetResponse} entity.
 *
 * Each method closes over the connection's ID and delegates to the
 * underlying service.
 */
export interface ConnectionMethods {
  /**
   * Check whether this connection is currently active.
   *
   * @param options - Optional `forceRefresh` flag and folder scoping
   * @returns Promise resolving to a {@link ConnectionPingResponse}
   */
  ping(options?: ConnectionPingOptions): Promise<ConnectionPingResponse>;

  /**
   * Start an OAuth re-authentication session for this connection.
   *
   * @param options - Optional folder scoping
   * @returns Promise resolving to a {@link ConnectionReauthenticateResponse}
   */
  reauthenticate(options?: ConnectionReauthenticateOptions): Promise<ConnectionReauthenticateResponse>;
}

function createConnectionMethods(
  data: RawConnectionGetResponse,
  service: ConnectionsServiceModel,
): ConnectionMethods {
  return {
    async ping(options?: ConnectionPingOptions): Promise<ConnectionPingResponse> {
      if (!data.id) throw new Error('Connection id is undefined');
      return service.ping(data.id, options);
    },
    async reauthenticate(options?: ConnectionReauthenticateOptions): Promise<ConnectionReauthenticateResponse> {
      if (!data.id) throw new Error('Connection id is undefined');
      return service.reauthenticate(data.id, options);
    },
  };
}

/**
 * Attaches bound methods to a raw connection response.
 *
 * @param data - Raw connection data from the API
 * @param service - The Connections service used to delegate bound-method calls
 * @returns A {@link ConnectionGetResponse} (raw data + methods)
 */
export function createConnectionWithMethods(
  data: RawConnectionGetResponse,
  service: ConnectionsServiceModel,
): ConnectionGetResponse {
  const methods = createConnectionMethods(data, service);
  return Object.assign({}, data, methods) as ConnectionGetResponse;
}
