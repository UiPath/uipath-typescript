/**
 * Integration Service — Connection models
 */

import {
  ConnectionGetResponse,
  ConnectionGetAllOptions,
  ConnectionGetByIdOptions,
} from './connections.types';
import type { ConnectionResource } from '@/resources';

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
   * to list a folder's connections. When none is supplied, a deployed coded
   * app's folder is used; elsewhere, including in a coded function, the service
   * lists the caller's personal workspace, so a robot account, which has none,
   * gets an empty list.
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
   * When an admin remapped this connection id at deployment, the call targets the
   * connection it was mapped to.
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

  /**
   * Get a single connection declared in `uipath_resources.ts`.
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * When an admin remapped the connection at deployment, the call targets the
   * connection it was mapped to, in that connection's folder. A folder option passed
   * explicitly (`folderId` / `folderKey` / `folderPath`) takes precedence.
   *
   * @param connection - Handle created with `resource.connection()` from `@uipath/uipath-typescript/resources`
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional `includeConfigs` flag
   * @returns Promise resolving to a {@link ConnectionGetResponse}
   * @example
   * ```typescript
   * // uipath_resources.ts
   * import { resource } from '@uipath/uipath-typescript/resources';
   *
   * export class ProjectResources {
   *   static readonly financeSlack = resource.connection({ id: '<connectionId>', connector: 'uipath-slack' });
   * }
   *
   * // anywhere in the project
   * import { Connections } from '@uipath/uipath-typescript/connections';
   *
   * const connections = new Connections(sdk);
   * const conn = await connections.getById(ProjectResources.financeSlack);
   * ```
   */
  getById(connection: ConnectionResource, options?: ConnectionGetByIdOptions): Promise<ConnectionGetResponse>;

}
