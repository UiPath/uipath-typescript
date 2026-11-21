/**
 * Integration Service test constants.
 */

import { LifeCycleStage } from '../../../src/models/integration-service/connectors.types';

export const IS_TEST_CONSTANTS = {
  CONNECTOR_KEY: 'uipath-uipath-airdk',
  CONNECTOR_ID: 7074,
  CONNECTOR_NAME: 'UiPath GenAI Activities',
  CONNECTOR_TIER: '2',
  CONNECTOR_LIFECYCLE_GA: LifeCycleStage.GA,
  CONNECTION_ID: '29d931e5-00a5-45e9-b5e9-b9bd80844396',
  CONNECTION_ID_2: 'b4022e19-3007-4383-b664-30444b156286',
  CONNECTION_NAME: 'UiPath GenAI Activities',
  CONNECTION_OWNER: 'tester@uipath.com',
  CONNECTION_CREATE_TIME: '2026-01-01T00:00:00.000Z',
  CONNECTION_UPDATE_TIME: '2026-06-01T00:00:00.000Z',
  ELEMENT_INSTANCE_ID: 12345,
  FOLDER_KEY: '5638e7df-c0ca-400d-af47-ea001baf6fd5',
  /** Whitespace-only folder key — must be treated as absent folder context. */
  FOLDER_KEY_WHITESPACE: '   ',
  FOLDER_ID: 4321,
  FOLDER_PATH: 'Shared/Finance',
  /** `FOLDER_PATH` encoded as base64-of-UTF-16-LE, per the Orchestrator folder-path contract. */
  FOLDER_PATH_ENCODED_VALUE: 'UwBoAGEAcgBlAGQALwBGAGkAbgBhAG4AYwBlAA==',
  FOLDER_DISPLAY_NAME: 'Test Folder',
  /** Vendor path sent through the HTTP passthrough, resolved against the connection's base URL. */
  VENDOR_PATH: '/v2/tickets',
  VENDOR_ERROR_MESSAGE: 'Ticket not found',
  /** Full vendor URL, which the version 4 engine needs. */
  VENDOR_URL: 'https://api.example.com/v2/tickets',
  /** Connector versions on either side of the engine switch. */
  CONNECTOR_VERSION_V3: '3.2.1',
  CONNECTOR_VERSION_V4: '4.0.0',
  FILE_PART_NAME: 'file',
  FILE_NAME: 'report.pdf',
  FILE_CONTENT_TYPE: 'application/pdf',
  /** Boundary of a version 4 two-part answer. */
  MULTIPART_BOUNDARY: 'ipe-0123456789abcdef0123456789abcdef',
  /** Page tokens are base64url JSON; these two point at further pages. */
  PAGE_TOKEN: Buffer.from(JSON.stringify({ providerNextPage: '2' })).toString('base64url'),
  PAGE_TOKEN_2: Buffer.from(JSON.stringify({ providerNextPage: '3' })).toString('base64url'),
  /** Token a connector sends with its last page. */
  PAGE_TOKEN_DONE: Buffer.from(JSON.stringify({ providerNextPage: 'done' })).toString('base64url'),
  /** Token that is not base64url JSON. */
  PAGE_TOKEN_OPAQUE: 'not a json token',
  ERROR_CONNECTOR_NOT_FOUND: 'Connector not found',
  ERROR_CONNECTION_NOT_FOUND: 'Connection not found',
} as const;
