/**
 * Integration Service — Connection types
 *
 * Types for the Connections API (`connections_/api/v1/Connections`).
 */

/**
 * Lifecycle state of an Integration Service connection.
 */
export enum ConnectionState {
  /** Connection is healthy and authorized. */
  Enabled = 'Enabled',
  /** Connection has been administratively disabled. */
  Disabled = 'Disabled',
  /** Token expired and needs re-authentication. */
  Expired = 'Expired',
  /** Connection failed validation or upstream error. */
  Failed = 'Failed',
}

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
 * Raw connection response from the Integration Service API.
 */
export interface RawConnectionGetResponse {
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
export interface ConnectionGetAllOptions {
  /** Folder key (GUID) to scope the query to a specific folder. Sent as `x-uipath-folderkey` header. */
  folderKey?: string;
  /** Include connections from all folders the caller has access to. */
  allFolders?: boolean;
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
export interface ConnectionGetByIdOptions {
  /** Folder key (GUID) to scope the lookup. */
  folderKey?: string;
  /** Search across folders the caller has access to. */
  allFolders?: boolean;
  /** Include the connector's full configuration blob in the response. */
  includeConfigs?: boolean;
}

/**
 * Options for {@link ConnectionsServiceModel.ping}.
 */
export interface ConnectionPingOptions {
  /** Folder key (GUID) to scope the lookup. */
  folderKey?: string;
  /** Search across folders the caller has access to. */
  allFolders?: boolean;
  /** Force a live re-validation instead of cached status. */
  forceRefresh?: boolean;
}

/**
 * Response from {@link ConnectionsServiceModel.ping}.
 */
export interface ConnectionPingResponse {
  /** Connector key for the pinged connection. */
  connector: string;
  /** Current connection state. */
  status: ConnectionState;
  /** Error message if the ping failed. */
  error?: string;
}

/**
 * Options for {@link ConnectionsServiceModel.reauthenticate}.
 */
export interface ConnectionReauthenticateOptions {
  /** Folder key (GUID) to scope the operation. */
  folderKey?: string;
  /** Search across folders the caller has access to. */
  allFolders?: boolean;
}

/**
 * Response from {@link ConnectionsServiceModel.reauthenticate}.
 *
 * Re-authentication is a multi-step OAuth flow — the SDK returns the session
 * handle and the auth URL the user must visit to grant consent.
 */
export interface ConnectionReauthenticateResponse {
  /** Connector key for the connection being re-authenticated. */
  connector: string;
  /** Session ID used to poll for auth completion. */
  sessionId: string;
  /** Epoch milliseconds when the auth session expires. */
  expiresAt: number;
  /** URL the user must visit to grant or refresh OAuth consent. */
  authUrl: string;
}
