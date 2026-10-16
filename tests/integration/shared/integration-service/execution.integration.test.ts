import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, describeIntegration, InitMode } from '../../config/unified-setup';
import { execute } from '../../../../src/services/integration-service/execution/execution';
import type { UiPath } from '../../../../src/core/uipath';

const modes: InitMode[] = ['v1'];
const EXECUTE_ATTEMPTS = 3;
const EXECUTE_RETRY_DELAY_MS = 2000;

const isTransientStatus = (status: number): boolean => status === 429 || status >= 500;

// Integration Service rejects PATs (401), so these suites run under UIPATH_USER_TOKEN.
describeIntegration('Integration Service Execute - Integration Tests', 'user', modes, () => {
  let sdk!: UiPath;
  let connectionId!: string;
  let objectName!: string;

  beforeAll(() => {
    sdk = getServices().sdk;

    const config = getTestConfig();
    if (!config.integrationServiceTestConnectionId) {
      throw new Error('INTEGRATION_SERVICE_TEST_CONNECTION_ID must be set in .env.integration');
    }
    // Not every object supports GET, so the target must be configured.
    if (!config.integrationServiceTestObjectName) {
      throw new Error('INTEGRATION_SERVICE_TEST_OBJECT_NAME must be set to an object that supports GET');
    }
    connectionId = config.integrationServiceTestConnectionId;
    objectName = config.integrationServiceTestObjectName;
  });

  describe('GET passthrough', () => {
    it('should return a successful response for an object the connection exposes', async () => {
      // Retry transient upstream failures only.
      let result = await execute(sdk, connectionId, objectName, 'GET');
      for (let attempt = 1; attempt < EXECUTE_ATTEMPTS && isTransientStatus(result.status); attempt++) {
        await new Promise((resolve) => setTimeout(resolve, EXECUTE_RETRY_DELAY_MS * attempt));
        result = await execute(sdk, connectionId, objectName, 'GET');
      }

      expect(result.ok, `GET ${objectName} returned ${result.status}`).toBe(true);
      expect(Object.keys(result.headers).length).toBeGreaterThan(0);
    });

    it('should surface a non-2xx response as an envelope instead of throwing', async () => {
      // execute returns non-2xx responses instead of throwing.
      const result = await execute(sdk, connectionId, '__non_existent_object__', 'GET');

      expect(result.ok).toBe(false);
      expect(result.status).toBeGreaterThanOrEqual(400);
      expect(result.status).toBeLessThan(600);
    });
  });
});
