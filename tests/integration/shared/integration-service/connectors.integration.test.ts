import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { ConnectorsService } from '../../../../src/services/integration-service/connectors/connectors';

const modes: InitMode[] = ['v1'];

describe.each(modes)('Integration Service — Connectors [%s]', (mode) => {
  setupUnifiedTests(mode);

  let connectors!: ConnectorsService;
  let connectorKey!: string;

  beforeAll(() => {
    const service = getServices().isConnectors;
    if (!service) {
      throw new Error('Connectors service is not registered for this init mode');
    }
    connectors = service;

    const config = getTestConfig();
    if (!config.isConnectorKey) {
      throw new Error(
        'INTEGRATION_SERVICE_TEST_CONNECTOR_KEY must be set in .env.integration to run Connectors integration tests',
      );
    }
    connectorKey = config.isConnectorKey;
  });

  describe('getAll', () => {
    it.only('should return a non-empty list of connectors as a plain array', async () => {
      const result = await connectors.getAll();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      const sample = result[0];
      expect(typeof sample.id).toBe('number');
      expect(typeof sample.key).toBe('string');
      expect(typeof sample.name).toBe('string');
      expect(typeof sample.isPrivate).toBe('boolean');
    });

    it('should accept hasHttpRequest filter without error', async () => {
      const result = await connectors.getAll({ hasHttpRequest: true });
      expect(Array.isArray(result)).toBe(true);
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

    it('should error when the connector does not exist', async () => {
      await expect(
        connectors.getById('this-connector-does-not-exist-xyz'),
      ).rejects.toThrow();
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
      // Bound methods must be attached
      expect(typeof sample.ping).toBe('function');
      expect(typeof sample.reauthenticate).toBe('function');
    });

    it('should respect pageSize', async () => {
      const result = await connectors.getConnections(connectorKey, { pageSize: 1 });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getDefaultConnection', () => {
    it('should return the default connection for a connector that has one', async () => {
      const result = await connectors.getDefaultConnection(connectorKey);

      expect(result).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(typeof result.isDefault).toBe('boolean');
      expect(typeof result.ping).toBe('function');
    });
  });
});
