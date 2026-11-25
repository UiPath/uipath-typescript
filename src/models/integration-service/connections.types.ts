/**
 * Integration Service — Connection types
 *
 * Types for the Connections API (`connections_/api/v1/Connections`).
 */

import { ConnectionState } from '../common/types';
import { IntegrationServiceFolderContextOptions } from './integration-service.types';

export { ConnectionState };

/**
 * Folder context associated with a connection.
 */
export interface ConnectionFolder {
  /** Folder GUID. */
  key: string;
  /** Folder display name. */
  displayName: string;
  /** Slash-delimited folder path. */
  fullyQualifiedName?: string;
  /** Folder kind (Personal, Standard, ...). */
  folderType?: string;
}

/**
 * Connector metadata embedded in a connection response.
 *
 * The full {@link ConnectorGetResponse} shape is nested on every connection;
 * we expose its commonly-used fields here so callers don't need a separate
 * lookup for basics like the connector key and display name.
 */
export interface ConnectionConnectorRef {
  /** Numeric connector ID. */
  id: number;
  /** Connector key (used as `elementKey` for Elements API calls). */
  key: string;
  /** Display name of the connector (e.g. "Slack", "Microsoft OneDrive"). */
  name: string;
  /** Connector lifecycle stage (e.g. `GA`, `BETA`, `CUSTOM`). */
  lifeCycleStage?: string;
  /** Connector tier (e.g. `1`, `2`). */
  tier?: string;
  /** Whether this connector publishes events / triggers. */
  hasEvents?: boolean;
  /** Whether the connector is private (custom or org-scoped). */
  isPrivate?: boolean;
}

/**
 * A connection returned by the Integration Service API.
 */
export interface ConnectionGetResponse {
  /** Connection ID (GUID). */
  id: string;
  /** User-supplied connection name. */
  name: string;
  /** Email or principal that created the connection. */
  owner?: string;
  /** ISO timestamp the connection was created (UTC). */
  createTime: string;
  /** ISO timestamp of the last modification (UTC). */
  updateTime: string;
  /** Current lifecycle state. */
  state: ConnectionState;
  /** Resolved API base URI used when invoking this connection. */
  apiBaseUri?: string;
  /** Cloud Elements instance ID backing this connection. */
  elementInstanceId: number;
  /** Connector metadata snapshot. */
  connector?: ConnectionConnectorRef;
  /** Whether this connection is the default for its connector + folder. */
  isDefault: boolean;
  /** Last time the connection was used at runtime. */
  lastUsedTime?: string;
  /** Stable identifier for the authenticated principal (e.g. external user ID). */
  connectionIdentity?: string;
  /** Poll interval in minutes for trigger-based event sourcing. */
  pollingIntervalInMinutes?: number;
  /** Folder context. */
  folder?: ConnectionFolder;
  /** Reason the connection was disabled (if `state === Disabled`). */
  disabledReason?: string;
  /** Version of the connector element backing this connection. */
  elementVersion?: string;
  /** Whether this is a Bring-Your-Own-Auth connection. */
  byoaConnection?: boolean;
}

/**
 * Options for {@link ConnectionsServiceModel.getAll}.
 *
 * The API returns a plain array — pagination is page-indexed via `pageIndex`/`pageSize`.
 * There is no continuation cursor; callers paginate by incrementing `pageIndex`.
 */
export interface ConnectionGetAllOptions extends IntegrationServiceFolderContextOptions {
  /** Include only default connections (one per connector per folder). */
  folderDefaults?: boolean;
  /** 1-indexed page number. */
  pageIndex?: number;
  /** Page size (number of items per page). */
  pageSize?: number;
  /** Sort newest-first. */
  mostRecentFirst?: boolean;
  /** Server-side filter expression. */
  filter?: string;
  /** Force connector refresh and skip cache. */
  fetchLatest?: boolean;
}

/**
 * Options for {@link ConnectionsServiceModel.getById}.
 */
export interface ConnectionGetByIdOptions extends IntegrationServiceFolderContextOptions {
  /** Include the connector's full configuration blob in the response. */
  includeConfigs?: boolean;
}

/**
 * A connection id typed by the key of the connector it belongs to.
 *
 * Use it for a coded function input that takes a connection. At run time the value is the
 * connection id string, so it goes wherever a connection id does: `executeHttp()`,
 * `executeActivity()`, `execute()` and `connections.getById()`. The connector key exists only in
 * the type: tools that read the function's input type use it to offer a picker of that
 * connector's connections. A call that needs the key at run time, such as a version 4
 * `executeHttp()`, still takes it as `connectorKey`.
 *
 * @typeParam ConnectorKey - Key of the connector, e.g. `uipath-zendesk`
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript';
 * import { executeHttp, type Connection } from '@uipath/uipath-typescript/integration-service';
 *
 * interface ListTicketsInput {
 *   zendesk: Connection<'uipath-zendesk'>;
 * }
 *
 * async function listTickets(sdk: UiPath, { zendesk }: ListTicketsInput) {
 *   return executeHttp(sdk, zendesk, '/v2/tickets');
 * }
 * ```
 */
export type Connection<ConnectorKey extends string = string> = string & {
  readonly __uipathConnector?: ConnectorKey;
};
