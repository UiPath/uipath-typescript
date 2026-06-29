import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { execute } from '../../../../src/services/integration-service/execution/execution';
import { ElementsService } from '../../../../src/services/integration-service/elements/elements';
import type { UiPath } from '../../../../src/core/uipath';

const modes: InitMode[] = ['v1'];

describe.each(modes)('Integration Service — execute [%s]', (mode) => {
  setupUnifiedTests(mode);

  let sdk!: UiPath;
  let elements!: ElementsService;
  let connectionId!: string;
  let elementKey!: string;
  let objectName!: string;

  beforeAll(async () => {
    const services = getServices();
    const elementsService = services.isElements;
    if (!elementsService) {
      throw new Error('Elements service is not registered for this init mode');
    }
    sdk = services.sdk;
    elements = elementsService;

    const config = getTestConfig();
    if (!config.isConnectionId) {
      throw new Error('INTEGRATION_SERVICE_TEST_CONNECTION_ID must be set in .env.integration');
    }
    if (!config.isConnectorKey) {
      throw new Error('INTEGRATION_SERVICE_TEST_CONNECTOR_KEY must be set in .env.integration');
    }
    connectionId = config.isConnectionId;
    elementKey = config.isConnectorKey;

    // Resolve an object the test connection actually exposes so the passthrough GET
    // has a target. Fallback to env override when supplied.
    const objects = await elements.getInstanceObjects(connectionId, elementKey);
    if (objects.length === 0) {
      throw new Error(
        `Connection ${connectionId} exposes no objects — cannot exercise execute.`,
      );
    }
    objectName = config.isObjectName ?? objects[0].name;
  });

  describe('GET passthrough', () => {
    it('should reach the connector and return an envelope', async () => {
      const result = await execute(sdk, connectionId, objectName, 'GET');

      expect(typeof result.ok).toBe('boolean');
      expect(typeof result.status).toBe('number');
      expect(typeof result.headers).toBe('object');
      // ok=true or ok=false are both valid here — the API or downstream connector
      // may legitimately reject the operation. Either way the envelope must arrive.
    });

    it('should preserve non-2xx responses without throwing', async () => {
      // Calls a deliberately non-existent objectName so the API rejects the request;
      // execute must surface the error envelope rather than throwing.
      const result = await execute(sdk, connectionId, '__non_existent_object__', 'GET');
      expect(result.ok).toBe(false);
      expect(result.status).toBeGreaterThanOrEqual(400);
    });
  });
});
