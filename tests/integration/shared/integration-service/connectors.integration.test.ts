import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, describeIntegration, InitMode } from '../../config/unified-setup';
import { ConnectorsService } from '../../../../src/services/integration-service/connectors/connectors';
import type { ConnectorGetResponse } from '../../../../src/models/integration-service/connectors.models';
import { isAuthenticationError, isUiPathError } from '../../../../src/core/errors';

const modes: InitMode[] = ['v1'];

// Integration Service validates JWTs locally (`bearerFormat: JWT` in its own
// swagger), so an opaque `rt_` PAT fails at parse before any scope check and every
// call returns a bare 401 identical to an anonymous request. The `'user'`
// requirement routes these suites to UIPATH_USER_TOKEN, so they skip on a
// PAT-only machine instead of failing.
describeIntegration('Integration Service Connectors - Integration Tests', 'user', modes, () => {
  let connectors!: ConnectorsService;
  let connectorKey!: string;
  let allConnectors!: ConnectorGetResponse[];

  beforeAll(async () => {
    const service = getServices().integrationServiceConnectors;
    if (!service) {
      throw new Error('Connectors service is not registered for this init mode');
    }
    connectors = service;

    const config = getTestConfig();
    if (!config.integrationServiceTestConnectorKey) {
      throw new Error(
        'INTEGRATION_SERVICE_TEST_CONNECTOR_KEY must be set in .env.integration to run Connectors integration tests',
      );
    }
    connectorKey = config.integrationServiceTestConnectorKey;

    allConnectors = await connectors.getAll();
  });

  describe('getAll', () => {
    it('should return a non-empty list of connectors as a plain array', () => {
      expect(Array.isArray(allConnectors)).toBe(true);
      expect(allConnectors.length).toBeGreaterThan(0);

      const sample = allConnectors[0];
      expect(typeof sample.id).toBe('number');
      expect(typeof sample.key).toBe('string');
      expect(typeof sample.name).toBe('string');
      expect(typeof sample.isPrivate).toBe('boolean');
    });

    it('should return no more connectors when filtered by hasHttpRequest', async () => {
      const result = await connectors.getAll({ hasHttpRequest: true });

      expect(Array.isArray(result)).toBe(true);
      // `hasHttpRequest` is a request-only filter — it has no counterpart on
      // ConnectorGetResponse, so the filter's effect cannot be asserted per item.
      // Comparing against the unfiltered listing is the strongest check available:
      // it catches a filter that broadens the result set. A filter silently
      // dropped by the API would still pass, which is a gap in the API surface
      // rather than in this test.
      expect(result.length).toBeLessThanOrEqual(allConnectors.length);
    });
  });

  describe('getById', () => {
    it('should retrieve a connector by key with camelCase response fields', async () => {
      const result = await connectors.getById(connectorKey);

      expect(result).toBeDefined();
      expect(result.key).toBe(connectorKey);
      expect(typeof result.name).toBe('string');
      expect(typeof result.id).toBe('number');

      // PascalCase keys must not be present — this validates the SDK returns the API shape verbatim
      // and exercises the assumption baked into the design (IS APIs return camelCase).
      const raw = result as unknown as Record<string, unknown>;
      expect(raw.Key).toBeUndefined();
      expect(raw.Name).toBeUndefined();
      expect(raw.Id).toBeUndefined();
    });

    it('should reject for a connector key that does not exist', async () => {
      // Asserting "a UiPath API error that is not an auth error" rather than
      // `isNotFoundError`: the exact status for an unknown connector key is not
      // yet confirmed against the live API, and a bare `rejects.toThrow()` would
      // be satisfied by a 401 from a stale token.
      await expect(
        connectors.getById('this-connector-does-not-exist-xyz'),
      ).rejects.toSatisfy((error: unknown) => isUiPathError(error) && !isAuthenticationError(error));
    });
  });

  describe('getConnections', () => {
    it('should list connections for a connector', async () => {
      const result = await connectors.getConnections(connectorKey);

      expect(Array.isArray(result)).toBe(true);
      if (result.length === 0) {
        throw new Error(
          `Connector ${connectorKey} has no connections in the test tenant — set up at least one connection to run this test.`,
        );
      }

      const sample = result[0];
      expect(typeof sample.id).toBe('string');
      expect(typeof sample.name).toBe('string');
      expect(typeof sample.createTime).toBe('string');
    });

    it('should respect pageSize', async () => {
      const result = await connectors.getConnections(connectorKey, { pageSize: 1 });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getDefaultConnection', () => {
    it('should return a connection flagged as the default', async () => {
      const result = await connectors.getDefaultConnection(connectorKey);

      expect(result).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(typeof result.name).toBe('string');
      // `isDefault` is the discriminator this endpoint exists to honour — a
      // `typeof` check would pass on the wrong connection being returned.
      expect(result.isDefault).toBe(true);
    });
  });
});
