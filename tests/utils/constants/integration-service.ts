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
  FOLDER_DISPLAY_NAME: 'Test Folder',
  AUTH_SESSION_ID: 'sess_abcdef0123456789',
  AUTH_URL: 'https://alpha.uipath.com/oauth/authorize?session_id=sess_abcdef0123456789',
  AUTH_EXPIRES_AT: 1782303998000,
  ERROR_CONNECTOR_NOT_FOUND: 'Connector not found',
  ERROR_CONNECTION_NOT_FOUND: 'Connection not found',
  ERROR_PING_FAILED: 'Ping failed',
} as const;
