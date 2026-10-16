import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, describeIntegration, InitMode } from '../../config/unified-setup';
import { ConnectionsService } from '../../../../src/services/integration-service/connections/connections';
import { ConnectionState } from '../../../../src/models/integration-service/connections.types';
import { NotFoundError } from '../../../../src/core/errors';

const modes: InitMode[] = ['v1'];

// Integration Service rejects PATs (401), so these suites run under UIPATH_USER_TOKEN.
describeIntegration('Integration Service Connections - Integration Tests', 'user', modes, () => {
  let connections!: ConnectionsService;
  let connectionId!: string;
  let folderKey!: string;

  beforeAll(async () => {
    const service = getServices().integrationServiceConnections;
    if (!service) {
      throw new Error('Connections service is not registered for this init mode');
    }
    connections = service;

    const config = getTestConfig();
    if (!config.integrationServiceTestConnectionId) {
      throw new Error(
        'INTEGRATION_SERVICE_TEST_CONNECTION_ID must be set in .env.integration to run Connections integration tests',
      );
    }
    connectionId = config.integrationServiceTestConnectionId;

    // Listings are folder-scoped; use the fixture connection's folder.
    const fixture = await connections.getById(connectionId);
    if (!fixture.folder?.key) {
      throw new Error(`Connection ${connectionId} has no folder key — cannot scope folder listings.`);
    }
    folderKey = fixture.folder.key;
  });

  describe('getAll', () => {
    it('should return the fixture connection when scoped to its folder', async () => {
      const result = await connections.getAll({ folderKey, pageSize: 50 });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result.map((connection) => connection.id)).toContain(connectionId);

      const sample = result[0];
      expect(typeof sample.id).toBe('string');
      expect(typeof sample.name).toBe('string');
      expect(Object.values(ConnectionState)).toContain(sample.state);

      // getAll has its own response path from getById.
      expect(sample).not.toHaveProperty('Id');
      expect(sample).not.toHaveProperty('Name');
      expect(sample).not.toHaveProperty('State');
    });
  });

  describe('getById', () => {
    it('should retrieve a connection by id with camelCase response fields', async () => {
      const result = await connections.getById(connectionId);

      expect(result.id).toBe(connectionId);
      expect(typeof result.name).toBe('string');
      expect(Object.values(ConnectionState)).toContain(result.state);
      expect(typeof result.createTime).toBe('string');

      // Payload is returned verbatim; guards against the API switching to PascalCase.
      expect(result).not.toHaveProperty('Id');
      expect(result).not.toHaveProperty('Name');
      expect(result).not.toHaveProperty('State');
      expect(result).not.toHaveProperty('CreateTime');
    });

    it('should reject for a connection id that does not exist', async () => {
      await expect(connections.getById(crypto.randomUUID())).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
