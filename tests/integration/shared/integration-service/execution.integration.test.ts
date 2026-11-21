import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, describeIntegration, InitMode } from '../../config/unified-setup';
import { execute } from '../../../../src/services/integration-service/execution/execution';
import { executeActivity } from '@/services/integration-service/execution/activity';
import type { UiPath } from '../../../../src/core/uipath';
import { resource } from '@/resources';

const modes: InitMode[] = ['v1'];
const EXECUTE_ATTEMPTS = 3;
const EXECUTE_RETRY_DELAY_MS = 2000;

const isTransientStatus = (status: number): boolean => status === 429 || status >= 500;

// Retry transient upstream failures only.
async function retryTransient<T extends { status: number }>(run: () => Promise<T>): Promise<T> {
  let result = await run();
  for (let attempt = 1; attempt < EXECUTE_ATTEMPTS && isTransientStatus(result.status); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, EXECUTE_RETRY_DELAY_MS * attempt));
    result = await run();
  }
  return result;
}

// Integration Service rejects PATs (401), so these suites run under UIPATH_USER_TOKEN.
describeIntegration('Integration Service Execute - Integration Tests', 'user', modes, () => {
  let sdk!: UiPath;
  let connectionId!: string;
  let connectorKey!: string;
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
    if (!config.integrationServiceTestConnectorKey) {
      throw new Error('INTEGRATION_SERVICE_TEST_CONNECTOR_KEY must be set in .env.integration');
    }
    connectionId = config.integrationServiceTestConnectionId;
    connectorKey = config.integrationServiceTestConnectorKey;
    objectName = config.integrationServiceTestObjectName;
  });

  describe('GET passthrough', () => {
    it('should return a successful response for an object the connection exposes', async () => {
      const result = await retryTransient(() => execute(sdk, connectionId, objectName, 'GET'));

      expect(result.ok, `GET ${objectName} returned ${result.status}`).toBe(true);
      expect(Object.keys(result.headers).length).toBeGreaterThan(0);
    });

    it('should reach the same connection from a resource.connection() handle', async () => {
      const connection = resource.connection({ id: connectionId, connector: connectorKey });
      const result = await retryTransient(() => execute(sdk, connection, objectName, 'GET'));

      expect(result.ok, `GET ${objectName} through a handle returned ${result.status}`).toBe(true);
    });

    it('should surface a non-2xx response as an envelope instead of throwing', async () => {
      // execute returns non-2xx responses instead of throwing.
      const result = await execute(sdk, connectionId, '__non_existent_object__', 'GET');

      expect(result.ok).toBe(false);
      expect(result.status).toBeGreaterThanOrEqual(400);
      expect(result.status).toBeLessThan(600);
    });
  });

  describe('connector activity', () => {
    it('should return a successful response for an object the connection exposes', async () => {
      const result = await retryTransient(() => executeActivity(sdk, connectionId, objectName, 'GET'));

      expect(result.ok, `GET ${objectName} returned ${result.status}`).toBe(true);
      expect(Object.keys(result.headers).length).toBeGreaterThan(0);
    });

    it('should return no more than maxRecords records', async () => {
      const result = await retryTransient(() =>
        executeActivity(sdk, connectionId, objectName, 'GET', { maxRecords: 1 }),
      );

      expect(result.ok, `GET ${objectName} with maxRecords returned ${result.status}`).toBe(true);
      // An object that returns a single record instead of a list is left as it is
      if (Array.isArray(result.body)) {
        expect(result.body.length).toBeLessThanOrEqual(1);
      }
    });

    it('should surface a non-2xx response as an envelope instead of throwing', async () => {
      const result = await executeActivity(sdk, connectionId, '__non_existent_object__', 'GET');

      expect(result.ok).toBe(false);
      expect(result.status).toBeGreaterThanOrEqual(400);
      expect(result.status).toBeLessThan(600);
    });
  });

});
