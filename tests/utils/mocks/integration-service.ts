/**
 * Integration Service mock factories.
 *
 * Returns raw response shapes (no bound methods) — the service layer attaches
 * methods via `create{Entity}WithMethods()`.
 */

import { IS_TEST_CONSTANTS } from '../constants/integration-service';
import { createMockBaseResponse } from './core';
import { ConnectionState } from '../../../src/models/integration-service/connections.types';
import type { RawConnectionGetResponse } from '../../../src/models/integration-service/connections.types';

/**
 * Creates a mock raw Connection response.
 */
export const createMockConnection = (
  overrides: Partial<RawConnectionGetResponse> = {},
): RawConnectionGetResponse => {
  return createMockBaseResponse<RawConnectionGetResponse>(
    {
      id: IS_TEST_CONSTANTS.CONNECTION_ID,
      name: IS_TEST_CONSTANTS.CONNECTION_NAME,
      owner: IS_TEST_CONSTANTS.CONNECTION_OWNER,
      createTime: IS_TEST_CONSTANTS.CONNECTION_CREATE_TIME,
      updateTime: IS_TEST_CONSTANTS.CONNECTION_UPDATE_TIME,
      state: ConnectionState.Enabled,
      apiBaseUri: 'https://api.example.invalid/v1',
      elementInstanceId: IS_TEST_CONSTANTS.ELEMENT_INSTANCE_ID,
      connector: {
        id: IS_TEST_CONSTANTS.CONNECTOR_ID,
        key: IS_TEST_CONSTANTS.CONNECTOR_KEY,
        name: IS_TEST_CONSTANTS.CONNECTOR_NAME,
        lifeCycleStage: IS_TEST_CONSTANTS.CONNECTOR_LIFECYCLE_GA,
        tier: IS_TEST_CONSTANTS.CONNECTOR_TIER,
        hasEvents: true,
        isPrivate: false,
      },
      isDefault: true,
      lastUsedTime: IS_TEST_CONSTANTS.CONNECTION_UPDATE_TIME,
      connectionIdentity: 'tester@uipath.com',
      pollingIntervalInMinutes: 5,
      folder: {
        key: IS_TEST_CONSTANTS.FOLDER_KEY,
        displayName: IS_TEST_CONSTANTS.FOLDER_DISPLAY_NAME,
      },
      elementVersion: '1.0.0',
      byoaConnection: false,
    },
    overrides,
  );
};
