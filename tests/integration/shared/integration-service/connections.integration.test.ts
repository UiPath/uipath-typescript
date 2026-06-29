import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { ConnectionsService } from '../../../../src/services/integration-service/connections/connections';
import {
  ConnectionState,
} from '../../../../src/models/integration-service/connections.types';

const modes: InitMode[] = ['v1'];

describe.each(modes)('Integration Service — Connections [%s]', (mode) => {
  setupUnifiedTests(mode);

  let connections!: ConnectionsService;
  let connectionId!: string;

  beforeAll(() => {
    const service = getServices().isConnections;
    if (!service) {
      throw new Error('Connections service is not registered for this init mode');
    }
    connections = service;

    const config = getTestConfig();
    if (!config.isConnectionId) {
      throw new Error(
        'INTEGRATION_SERVICE_TEST_CONNECTION_ID must be set in .env.integration to run Connections integration tests',
      );
    }
    connectionId = config.isConnectionId;
  });

  describe('getAll', () => {
    it('should return a plain array of connections with bound methods', async () => {
      const result = await connections.getAll({ pageSize: 5 });

      expect(Array.isArray(result)).toBe(true);
      if (result.length === 0) {
        throw new Error(
          'Test tenant has no connections — create at least one connection to run Connections integration tests.',
        );
      }

      const sample = result[0];
      expect(typeof sample.id).toBe('string');
      expect(typeof sample.name).toBe('string');
      expect(typeof sample.ping).toBe('function');
      expect(typeof sample.reauthenticate).toBe('function');
    });

    it('should respect mostRecentFirst sorting', async () => {
      const result = await connections.getAll({ pageSize: 3, mostRecentFirst: true });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getById', () => {
    it('should retrieve a connection by id with camelCase response fields', async () => {
      const result = await connections.getById(connectionId);

      expect(result.id).toBe(connectionId);
      expect(typeof result.name).toBe('string');
      expect(typeof result.state).toBe('string');
      expect(typeof result.createTime).toBe('string');

      // PascalCase API fields must be absent
      const raw = result as unknown as Record<string, unknown>;
      expect(raw.Id).toBeUndefined();
      expect(raw.Name).toBeUndefined();
      expect(raw.State).toBeUndefined();
      expect(raw.CreateTime).toBeUndefined();
    });

    it('should error when the connection does not exist', async () => {
      await expect(
        connections.getById('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow();
    });
  });

  describe('ping', () => {
    it('should return a status for a known connection', async () => {
      const result = await connections.ping(connectionId);

      expect(typeof result.connector).toBe('string');
      expect(Object.values(ConnectionState)).toContain(result.status);
    });

    it('should accept forceRefresh', async () => {
      const result = await connections.ping(connectionId, { forceRefresh: true });
      expect(Object.values(ConnectionState)).toContain(result.status);
    });
  });

  describe('bound methods on Connection entity', () => {
    it('connection.ping() should delegate to the service and resolve', async () => {
      const conn = await connections.getById(connectionId);
      const status = await conn.ping();
      expect(Object.values(ConnectionState)).toContain(status.status);
    });
  });

  // reauthenticate is a mutating OAuth-flow trigger that would invalidate the
  // existing session in the test tenant — exercise it only as a smoke test that
  // the SDK plumbing reaches the API. Live tests can verify shape (sessionId
  // present, authUrl present). Skipping by default to avoid disturbing the
  // shared test tenant. To exercise: remove `.skip` and set the env flag.
  describe.skip('reauthenticate (manual run only)', () => {
    it('should return an authUrl + sessionId payload', async () => {
      const session = await connections.reauthenticate(connectionId);
      expect(typeof session.sessionId).toBe('string');
      expect(typeof session.authUrl).toBe('string');
      expect(typeof session.expiresAt).toBe('number');
    });
  });
});
