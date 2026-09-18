import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, describeIntegration, InitMode } from '../../config/unified-setup';
import { ConnectionsService } from '../../../../src/services/integration-service/connections/connections';
import { ConnectionState } from '../../../../src/models/integration-service/connections.types';
import { isAuthenticationError, isUiPathError } from '../../../../src/core/errors';

const modes: InitMode[] = ['v1'];

// Integration Service validates JWTs locally (`bearerFormat: JWT` in its own
// swagger), so an opaque `rt_` PAT fails at parse before any scope check and every
// call returns a bare 401 identical to an anonymous request. The `'user'`
// requirement routes this suite to UIPATH_USER_TOKEN, so it skips on a PAT-only
// machine instead of failing.
describeIntegration('Integration Service Connections - Integration Tests', 'user', modes, () => {
  let connections!: ConnectionsService;
  let connectionId!: string;

  beforeAll(() => {
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
  });

  describe('getAll', () => {
    it('should return a plain array of connections', async () => {
      const result = await connections.getAll({ pageSize: 5 });

      expect(Array.isArray(result)).toBe(true);
      if (result.length === 0) {
        throw new Error(
          'Test tenant has no connections — create at least one connection to run Connections integration tests.',
        );
      }
      expect(result.length).toBeLessThanOrEqual(5);

      const sample = result[0];
      expect(typeof sample.id).toBe('string');
      expect(typeof sample.name).toBe('string');
      expect(Object.values(ConnectionState)).toContain(sample.state);
    });

    it('should order results newest-first when mostRecentFirst is set', async () => {
      const result = await connections.getAll({ pageSize: 3, mostRecentFirst: true });

      expect(Array.isArray(result)).toBe(true);
      if (result.length < 2) {
        throw new Error(
          'Test tenant has fewer than 2 connections — ordering cannot be verified. Create a second connection to run this test.',
        );
      }

      // Assert the ordering the flag requests, not just that a response arrived —
      // a shape-only assertion passes even when the flag never reaches the API,
      // and a single-element array trivially equals its own sort.
      const timestamps = result.map((connection) => Date.parse(connection.createTime));
      expect(timestamps.every((value) => Number.isFinite(value))).toBe(true);
      const descending = [...timestamps].sort((a, b) => b - a);
      expect(timestamps).toEqual(descending);
    });
  });

  describe('getById', () => {
    it('should retrieve a connection by id with camelCase response fields', async () => {
      const result = await connections.getById(connectionId);

      expect(result.id).toBe(connectionId);
      expect(typeof result.name).toBe('string');
      expect(Object.values(ConnectionState)).toContain(result.state);
      expect(typeof result.createTime).toBe('string');

      // The service returns the API payload verbatim, so this guards against the
      // API switching to PascalCase rather than validating an SDK transform.
      const raw = result as unknown as Record<string, unknown>;
      expect(raw.Id).toBeUndefined();
      expect(raw.Name).toBeUndefined();
      expect(raw.State).toBeUndefined();
      expect(raw.CreateTime).toBeUndefined();
    });

    it('should reject for a connection id that does not exist', async () => {
      // A random GUID is well-formed but certainly absent, so the API rejects it
      // rather than failing validation. Asserting "a UiPath API error that is not
      // an auth error" rather than `isNotFoundError`: the exact status for an
      // unknown connection id is not yet confirmed against the live API, and a
      // bare `rejects.toThrow()` would be satisfied by a 401 from a stale token.
      await expect(connections.getById(crypto.randomUUID())).rejects.toSatisfy(
        (error: unknown) => isUiPathError(error) && !isAuthenticationError(error),
      );
    });
  });
});
