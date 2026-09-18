/**
 * Integration Service — Connection models
 */

import {
  ConnectionGetResponse,
  ConnectionGetAllOptions,
  ConnectionGetByIdOptions,
} from './connections.types';

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
   * import { Connections } from '@uipath/uipath-typescript/connections';
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
   * import { Connections } from '@uipath/uipath-typescript/connections';
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

}
