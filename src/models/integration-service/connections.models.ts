/**
 * Integration Service — Connection models
 *
 * Combines raw connection data with bound entity methods (`ping`).
 */

import {
  RawConnectionGetResponse,
  ConnectionGetAllOptions,
  ConnectionGetByIdOptions,
  ConnectionPingOptions,
  ConnectionPingResponse,
} from './connections.types';

/**
 * A Connection entity enriched with bound methods.
 *
 * Returned by every Connection-yielding method on the {@link ConnectionsServiceModel}
 * and {@link ConnectorsServiceModel}. The bound `ping` method closes over this
 * connection's ID so callers can act on the entity directly.
 */
export type ConnectionGetResponse = RawConnectionGetResponse & ConnectionMethods;

/**
 *
 * @experimental
 *
 * /// warning
 * Preview: This service is experimental and may change or be removed in future releases.
 * ///
 *
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
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Returns a plain array of connection entities. Pagination is page-indexed
   * via `pageIndex`/`pageSize`; there is no continuation cursor, so callers
   * paginate by incrementing `pageIndex` until a short page is returned.
   *
   * Folder scoping is optional — pass `folderId`, `folderKey`, or `folderPath`
   * to narrow the query. When none is supplied, the folder context the SDK was
   * initialized with is used.
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
   * ```
   */
  getAll(options?: ConnectionGetAllOptions): Promise<ConnectionGetResponse[]>;

  /**
   * Get a single connection by ID.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
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
  getById(connectionId: string, options?: ConnectionGetByIdOptions): Promise<ConnectionGetResponse>;

  /**
   * Check whether a connection is currently active.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
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
  ping(connectionId: string, options?: ConnectionPingOptions): Promise<ConnectionPingResponse>;
}

/**
 *
 * @experimental
 *
 * /// warning
 * Preview: This service is experimental and may change or be removed in future releases.
 * ///
 *
 * Methods bound onto every {@link ConnectionGetResponse} entity.
 *
 * Each method closes over the connection's ID and delegates to the
 * underlying service.
 */
export interface ConnectionMethods {
  /**
   * Check whether this connection is currently active.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * @param options - Optional `forceRefresh` flag and folder scoping (`folderId` / `folderKey` / `folderPath`)
   * @returns Promise resolving to a {@link ConnectionPingResponse}
   */
  ping(options?: ConnectionPingOptions): Promise<ConnectionPingResponse>;
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
