/**
 * Connection types for Conversational Agent personal connections feature.
 *
 * These types support the UI for viewing and selecting user-configurable
 * connections in conversational agent settings.
 */

/**
 * A single connection available for selection
 */
export interface AvailableConnection {
  /** Unique identifier of the connection */
  id: string;
  /** Display name of the connection */
  name: string;
  /** Current state of the connection */
  state: 'Enabled' | 'Disabled' | 'Expired' | 'Failed';
  /** Whether this is the user's default connection for the connector */
  isDefault: boolean;
  /** Whether this connection belongs to the user's personal workspace */
  personalWorkspace: boolean;
  /** Key of the folder containing the connection, if applicable */
  folderKey: string | null;
  /** Display name of the folder containing the connection */
  folderName: string | null;
}

/**
 * A connector binding with its available connections.
 * Multiple bindings with the same connector key are grouped into one item.
 */
export interface AvailableConnectionsItem {
  /** Connector key identifying the type of connection (e.g. 'jira', 'outlook') */
  connectorKey: string;
  /** Display name of the connector */
  connectorName?: string;
  /** URL to the connector's icon/image */
  connectorImage?: string;
  /** Resource keys of the bindings grouped under this connector */
  resourceKeys: string[];
  /** ID of the currently selected connection, if any */
  currentConnectionId: string | null;
  /** Display name of the currently selected connection, if any */
  currentConnectionName: string | null;
  /** URL to configure connections for this connector in Orchestrator */
  configurationUrl?: string;
  /** URL to view all connections for this connector in Orchestrator */
  connectionsUrl?: string;
  /** Whether this connector binding can be configured by the user (false = admin-fixed) */
  isConfigurable?: boolean;
  /** List of connections available for selection */
  connections: AvailableConnection[];
}

/**
 * Response from the available connections endpoint.
 * Each item represents a configurable connector with its available connections.
 */
export type AvailableConnectionsResponse = AvailableConnectionsItem[];

/**
 * A single connection selection mapping a connector to a chosen connection
 */
export interface ConnectionSelection {
  /** Connector key to update */
  connectorKey: string;
  /** ID of the selected connection, or null to clear the selection */
  connectionId: string | null;
}

/**
 * Request body for updating the user's connection selections
 */
export interface UpdateConnectionSelectionsRequest {
  /** List of connection selections to apply */
  selections: ConnectionSelection[];
}

/**
 * Request body for generating a connector-specific auth URL
 */
export interface ConnectionAuthRequest {
  /** Connector key to generate the auth URL for */
  connectorKey: string;
}

/**
 * Response from the connection auth endpoint
 */
export interface ConnectionAuthResponse {
  /** The connector-specific auth URL to open */
  authUrl: string;
  /** Unix timestamp when the auth URL expires */
  expiresAt: number;
}
