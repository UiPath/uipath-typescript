/**
 * Integration Service — Connector types
 *
 * Types for the Connectors API (`connections_/api/v1/Connectors`).
 */

/**
 * Lifecycle stage of a connector.
 */
export enum LifeCycleStage {
  PREVIEW = 'PREVIEW',
  GA = 'GA',
  DEPRECATED = 'DEPRECATED',
  CUSTOM = 'CUSTOM',
}

/**
 * Authentication scheme descriptor on a connector (`oauth2`, `basic`, `apiKey`, ...).
 * Shape is connector-dependent; exposed as a record so the SDK doesn't impose
 * a closed schema on third-party connectors.
 */
export interface ConnectorAuthentication {
  /** Auth type identifier (e.g. `oauth2`, `basic`, `apiKey`). */
  type?: string;
  /** Free-form fields specific to the auth scheme. */
  [key: string]: unknown;
}

/**
 * Template metadata describing how the connector should be configured at runtime.
 * Shape is connector-dependent; preserved as-is from the API.
 */
export interface ConnectorTemplateProperties {
  [key: string]: unknown;
}

/**
 * Raw connector response from the Integration Service API.
 */
export interface RawConnectorGetResponse {
  /** Numeric connector ID. */
  id: number;
  /** Stable connector key (used as `elementKey` for Elements API calls). */
  key: string;
  /** Display name (e.g. "Slack", "Microsoft OneDrive"). */
  name: string;
  /** Free-form description. */
  description?: string;
  /** URL to the connector's logo image. */
  image?: string;
  /** Whether the connector is private (custom or org-scoped). */
  isPrivate: boolean;
  /** Whether the connector publishes events / triggers. */
  hasEvents?: boolean;
  /** Event types the connector emits. */
  eventTypes?: string[];
  /** Lifecycle stage. */
  lifeCycleStage?: LifeCycleStage;
  /** Tag string (comma-separated). */
  tags?: string;
  /** Connector classification (e.g. `application`, `database`). */
  type?: string;
  /** Tier (e.g. `1`, `2`). */
  tier?: string;
  /** Boolean feature flags exposed by the connector. */
  flags?: Record<string, boolean>;
  /** Template properties describing how to configure the connector. */
  templateProperties?: ConnectorTemplateProperties;
  /** Authentication scheme(s) supported by the connector. */
  authentication?: ConnectorAuthentication;
  /** Categories the connector belongs to (e.g. `CRM`, `Communication`). */
  categories?: string[];
  /** Number of connection instances for this connector. */
  connectionCount?: number;
  /** ID of the parent custom connector (when this connector is a fork). */
  customConnectorId?: number;
  /** Whether the connector is enabled on this tenant. */
  enabled?: boolean;
  /** Whether the caller owns the connector. */
  isOwner?: boolean;
  /** Vendor / publisher name. */
  vendorName?: string;
}

/**
 * Options for {@link ConnectorsServiceModel.getAll}.
 */
export interface ConnectorGetAllOptions {
  /** Limit results to connectors that expose an HTTP Request activity. */
  hasHttpRequest?: boolean;
}

// getById takes no body/query options — keyOrId is positional.

/**
 * Options for {@link ConnectorsServiceModel.getDefaultConnection}.
 */
export interface ConnectorGetDefaultConnectionOptions {
  /** Folder key (GUID) to scope the lookup. */
  folderKey?: string;
  /** Search across folders the caller has access to. */
  allFolders?: boolean;
}

/**
 * Options for {@link ConnectorsServiceModel.getConnections}.
 *
 * The API returns a plain array — pagination is page-indexed via `pageIndex`/`pageSize`.
 * There is no continuation cursor; callers paginate by incrementing `pageIndex`.
 */
export interface ConnectorGetConnectionsOptions {
  /** Folder key (GUID) to scope the query to a specific folder. */
  folderKey?: string;
  /** Include connections from all folders the caller has access to. */
  allFolders?: boolean;
  /** Include only default connections. */
  folderDefaults?: boolean;
  /** 1-indexed page number. */
  pageIndex?: number;
  /** Page size (number of items per page). */
  pageSize?: number;
  /** Sort newest-first. */
  mostRecentFirst?: boolean;
  /** Force a connector refresh, skipping cache. */
  fetchLatest?: boolean;
}
