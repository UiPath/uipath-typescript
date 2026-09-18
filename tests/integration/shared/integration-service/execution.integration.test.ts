import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, describeIntegration, InitMode } from '../../config/unified-setup';
import { execute } from '../../../../src/services/integration-service/execution/execution';
import { ElementsService } from '../../../../src/services/integration-service/elements/elements';
import type { UiPath } from '../../../../src/core/uipath';

const modes: InitMode[] = ['v1'];

// Integration Service validates JWTs locally (`bearerFormat: JWT` in its own
// swagger), so an opaque `rt_` PAT fails at parse before any scope check and every
// call returns a bare 401 identical to an anonymous request. The `'user'`
// requirement routes these suites to UIPATH_USER_TOKEN, so they skip on a
// PAT-only machine instead of failing.
describeIntegration('Integration Service Execute - Integration Tests', 'user', modes, () => {
  let sdk!: UiPath;
  let elements!: ElementsService;
  let connectionId!: string;
  let elementKey!: string;
  let objectName!: string;

  beforeAll(async () => {
    const services = getServices();
    const elementsService = services.integrationServiceElements;
    if (!elementsService) {
      throw new Error('Elements service is not registered for this init mode');
    }
    sdk = services.sdk;
    elements = elementsService;

    const config = getTestConfig();
    if (!config.integrationServiceTestConnectionId) {
      throw new Error('INTEGRATION_SERVICE_TEST_CONNECTION_ID must be set in .env.integration');
    }
    if (!config.integrationServiceTestConnectorKey) {
      throw new Error('INTEGRATION_SERVICE_TEST_CONNECTOR_KEY must be set in .env.integration');
    }
    connectionId = config.integrationServiceTestConnectionId;
    elementKey = config.integrationServiceTestConnectorKey;

    // Resolve an object the test connection actually exposes so the passthrough GET
    // has a target. Fallback to env override when supplied.
    const objects = await elements.getInstanceObjects(connectionId, elementKey);
    if (objects.length === 0) {
      throw new Error(
        `Connection ${connectionId} exposes no objects — cannot exercise execute.`,
      );
    }
    objectName = config.integrationServiceTestObjectName ?? objects[0].name;
  });

  describe('GET passthrough', () => {
    it('should reach the connector for an object the connection exposes', async () => {
      const result = await execute(sdk, connectionId, objectName, 'GET');

      expect(typeof result.ok).toBe('boolean');
      expect(typeof result.status).toBe('number');
      expect(Object.keys(result.headers).length).toBeGreaterThan(0);

      // `ok` is deliberately not asserted: the downstream connector may reject the
      // operation for its own reasons and the envelope must still arrive. But a 404
      // is not an acceptable outcome here — objectName came from this connection's
      // own object list, so a 404 means the SDK built the wrong passthrough URL
      // rather than the connector declining. Without this the test cannot fail on
      // a broken endpoint constant or base segment, which is its whole purpose.
      expect(result.status).not.toBe(404);
    });

    it('should surface a non-2xx response as an envelope instead of throwing', async () => {
      // A deliberately absent objectName, so the API rejects the request; execute
      // must return the error envelope rather than throw.
      const result = await execute(sdk, connectionId, '__non_existent_object__', 'GET');

      expect(result.ok).toBe(false);
      expect(result.status).toBeGreaterThanOrEqual(400);
      expect(result.status).toBeLessThan(600);
    });
  });
});
