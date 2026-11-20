import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, describeIntegration, InitMode } from '../../config/unified-setup';
import { ConnectorsService } from '../../../../src/services/integration-service/connectors/connectors';
import type { ConnectorGetResponse } from '../../../../src/models/integration-service/connectors.models';
import { NotFoundError } from '../../../../src/core/errors';

const modes: InitMode[] = ['v1'];

// Integration Service rejects PATs (401), so these suites run under UIPATH_USER_TOKEN.
describeIntegration('Integration Service Connectors - Integration Tests', 'user', modes, () => {
  let connectors!: ConnectorsService;
  let connectorKey!: string;
  let connectionId!: string;
  let folderKey!: string;
  let allConnectors!: ConnectorGetResponse[];

  beforeAll(async () => {
    const service = getServices().integrationServiceConnectors;
    const connectionsService = getServices().integrationServiceConnections;
    if (!service || !connectionsService) {
      throw new Error('Connectors and Connections services must be registered for this init mode');
    }
    connectors = service;

    const config = getTestConfig();
    if (!config.integrationServiceTestConnectorKey) {
      throw new Error(
        'INTEGRATION_SERVICE_TEST_CONNECTOR_KEY must be set in .env.integration to run Connectors integration tests',
      );
    }
    if (!config.integrationServiceTestConnectionId) {
      throw new Error(
        'INTEGRATION_SERVICE_TEST_CONNECTION_ID must be set in .env.integration to run Connectors integration tests',
      );
    }
    connectorKey = config.integrationServiceTestConnectorKey;
    connectionId = config.integrationServiceTestConnectionId;

    // Connection listings are folder-scoped; use the fixture connection's folder.
    const fixture = await connectionsService.getById(connectionId);
    if (!fixture.folder?.key) {
      throw new Error(`Connection ${connectionId} has no folder key — cannot scope folder listings.`);
    }
    folderKey = fixture.folder.key;

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

      // getAll has its own response path from getById.
      expect(sample).not.toHaveProperty('Id');
      expect(sample).not.toHaveProperty('Key');
      expect(sample).not.toHaveProperty('Name');
      expect(sample).not.toHaveProperty('IsPrivate');
    });

    it('should return no more connectors when filtered by hasHttpRequest', async () => {
      const result = await connectors.getAll({ hasHttpRequest: true });

      expect(Array.isArray(result)).toBe(true);
      // The filter has no response field to check per item, so compare against the unfiltered list.
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

      // Payload is returned verbatim; guards against the API switching to PascalCase.
      expect(result).not.toHaveProperty('Key');
      expect(result).not.toHaveProperty('Name');
      expect(result).not.toHaveProperty('Id');
    });

    it('should reject for a connector key that does not exist', async () => {
      await expect(
        connectors.getById('this-connector-does-not-exist-xyz'),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('getConnections', () => {
    it('should list the fixture connection for its connector and folder', async () => {
      const result = await connectors.getConnections(connectorKey, { folderKey });

      expect(Array.isArray(result)).toBe(true);
      expect(result.map((connection) => connection.id)).toContain(connectionId);

      const sample = result[0];
      expect(typeof sample.id).toBe('string');
      expect(typeof sample.name).toBe('string');
      expect(typeof sample.createTime).toBe('string');

      // Separate response path from Connections.getAll.
      expect(sample).not.toHaveProperty('Id');
      expect(sample).not.toHaveProperty('Name');
      expect(sample).not.toHaveProperty('CreateTime');
    });

    it('should respect pageSize', async () => {
      const result = await connectors.getConnections(connectorKey, { folderKey, pageSize: 1 });
      expect(result).toHaveLength(1);
    });
  });

  describe('getDefaultConnection', () => {
    it('should return a connection flagged as the default', async () => {
      const result = await connectors.getDefaultConnection(connectorKey, { folderKey });

      expect(result).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(typeof result.name).toBe('string');
      expect(result.isDefault).toBe(true);

      expect(result).not.toHaveProperty('Id');
      expect(result).not.toHaveProperty('Name');
      expect(result).not.toHaveProperty('IsDefault');
    });
  });
});
