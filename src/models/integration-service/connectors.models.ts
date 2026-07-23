/**
 * Integration Service — Connector models
 *
 * Connectors are read-only catalog entries — no bound entity methods are
 * attached (no `update`, `cancel`, etc. operate on a connector).
 */

import {
  RawConnectorGetResponse,
  ConnectorGetAllOptions,
  ConnectorGetDefaultConnectionOptions,
  ConnectorGetConnectionsOptions,
} from './connectors.types';
import { ConnectionGetResponse } from './connections.models';

/**
 * A connector catalog entry from the Integration Service.
 */
export interface ConnectorGetResponse extends RawConnectorGetResponse {}

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
export interface ConnectorsServiceModel {
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
  getAll(options?: ConnectorGetAllOptions): Promise<ConnectorGetResponse[]>;

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
  getById(keyOrId: string): Promise<ConnectorGetResponse>;

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
  getDefaultConnection(
    keyOrId: string,
    options?: ConnectorGetDefaultConnectionOptions,
  ): Promise<ConnectionGetResponse>;

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
  getConnections(
    keyOrId: string,
    options?: ConnectorGetConnectionsOptions,
  ): Promise<ConnectionGetResponse[]>;
}
