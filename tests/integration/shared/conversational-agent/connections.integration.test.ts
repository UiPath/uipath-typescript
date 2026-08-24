import { describe, it, expect, beforeAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  setupUnifiedTests,
  InitMode,
} from '../../config/unified-setup';
import { ConversationalAgentService } from '../../../../src/services/conversational-agent';
import type {
  AvailableConnectionsResponse,
} from '../../../../src/models/conversational-agent';
import { ConnectionState } from '../../../../src/models/conversational-agent';

const modes: InitMode[] = ['v1'];

// skip: CAS endpoints do not support PAT auth — requires OAuth.
// To run locally: grab a bearer token from browser DevTools and set it as UIPATH_SECRET,
// then change describe.skip.each to describe.each.
// Requires CAS_TEST_AGENT_ID and CAS_TEST_FOLDER_ID env vars.
describe.skip.each(modes)(
  'Conversational Agent Connections - Integration Tests [%s]',
  (mode) => {
    setupUnifiedTests(mode);

    let service!: ConversationalAgentService;
    let agentId!: number;
    let folderId!: number;

    beforeAll(() => {
      const services = getServices();
      if (!services.conversationalAgent) {
        throw new Error('ConversationalAgentService not initialized');
      }
      service = services.conversationalAgent;

      const config = getTestConfig();
      if (!config.casTestAgentId || !config.casTestFolderId) {
        throw new Error(
          'CAS_TEST_AGENT_ID and CAS_TEST_FOLDER_ID are required for personal connections integration tests'
        );
      }
      agentId = parseInt(config.casTestAgentId, 10);
      folderId = parseInt(config.casTestFolderId, 10);
    });

    describe('getAvailableConnections', () => {
      it('should retrieve available connections for an agent', async () => {
        const result = await service.getAvailableConnections(agentId, folderId);

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should return expected fields on connector items', async () => {
        const result = await service.getAvailableConnections(agentId, folderId);

        if (result.length === 0) {
          throw new Error(
            'No configurable connector bindings on the test agent — ' +
              'cannot verify response shape. Configure at least one user-configurable connector.'
          );
        }

        const item = result[0];
        expect(typeof item.connectorKey).toBe('string');
        expect(Array.isArray(item.resourceKeys)).toBe(true);
        expect(Array.isArray(item.connections)).toBe(true);

        // currentConnectionId / currentConnectionName are nullable
        expect('currentConnectionId' in item).toBe(true);
        expect('currentConnectionName' in item).toBe(true);
      });

      it('should return expected fields on individual connections', async () => {
        const result = await service.getAvailableConnections(agentId, folderId);

        const itemWithConnections = result.find((r) => r.connections.length > 0);
        if (!itemWithConnections) {
          throw new Error(
            'No connector bindings with available connections — ' +
              'cannot verify connection fields. Add at least one connection for a connector.'
          );
        }

        const connection = itemWithConnections.connections[0];
        expect(typeof connection.id).toBe('string');
        expect(typeof connection.name).toBe('string');
        expect(typeof connection.isDefault).toBe('boolean');
        expect(typeof connection.personalWorkspace).toBe('boolean');

        // state must be a valid ConnectionState enum value
        const validStates = new Set<string>(Object.values(ConnectionState));
        expect(validStates.has(connection.state)).toBe(true);
      });
    });

    describe('updateConnectionSelections', () => {
      let initialConnections!: AvailableConnectionsResponse;

      beforeAll(async () => {
        initialConnections = await service.getAvailableConnections(
          agentId,
          folderId
        );
      });

      it('should update and restore a connection selection', async () => {
        const configurableItem = initialConnections.find(
          (item) =>
            item.isConfigurable &&
            item.connections.filter((c) => c.state === ConnectionState.Enabled).length >= 2
        );
        if (!configurableItem) {
          throw new Error(
            'No configurable connector with at least 2 enabled connections — ' +
              'cannot test updateConnectionSelections round-trip. ' +
              'Add at least two enabled connections for one connector.'
          );
        }

        const enabledConnections = configurableItem.connections.filter(
          (c) => c.state === ConnectionState.Enabled
        );
        const originalConnectionId = configurableItem.currentConnectionId;

        // Pick an enabled connection that differs from the current selection
        const newConnectionId = enabledConnections.find(
          (c) => c.id !== originalConnectionId
        )!.id;

        // Update selection
        const updated = await service.updateConnectionSelections(
          agentId,
          folderId,
          {
            selections: [
              {
                connectorKey: configurableItem.connectorKey,
                connectionId: newConnectionId,
              },
            ],
          }
        );

        expect(Array.isArray(updated)).toBe(true);
        const updatedItem = updated.find(
          (item) => item.connectorKey === configurableItem.connectorKey
        );
        expect(updatedItem).toBeDefined();
        expect(updatedItem!.currentConnectionId).toBe(newConnectionId);

        // Restore: pick the original if it's enabled, otherwise clear
        const restoreId = enabledConnections.some((c) => c.id === originalConnectionId)
          ? originalConnectionId
          : null;
        await service.updateConnectionSelections(agentId, folderId, {
          selections: [
            {
              connectorKey: configurableItem.connectorKey,
              connectionId: restoreId,
            },
          ],
        });
      });

      it('should clear a connection selection and restore it', async () => {
        const configurableItem = initialConnections.find(
          (item) =>
            item.isConfigurable &&
            item.connections.some((c) => c.state === ConnectionState.Enabled) &&
            item.currentConnectionId !== null &&
            // The current selection must be enabled so we can restore it after clearing
            item.connections.some(
              (c) => c.id === item.currentConnectionId && c.state === ConnectionState.Enabled
            )
        );
        if (!configurableItem) {
          throw new Error(
            'No configurable connector with an enabled, currently-selected connection — ' +
              'cannot test clearing. Select an enabled connection for at least one connector first.'
          );
        }

        const originalConnectionId = configurableItem.currentConnectionId;

        // Clear the selection
        const cleared = await service.updateConnectionSelections(
          agentId,
          folderId,
          {
            selections: [
              {
                connectorKey: configurableItem.connectorKey,
                connectionId: null,
              },
            ],
          }
        );

        expect(Array.isArray(cleared)).toBe(true);
        const clearedItem = cleared.find(
          (item) => item.connectorKey === configurableItem.connectorKey
        );
        expect(clearedItem).toBeDefined();
        expect(clearedItem!.currentConnectionId).toBeNull();

        // Restore original selection (verified enabled above)
        await service.updateConnectionSelections(agentId, folderId, {
          selections: [
            {
              connectorKey: configurableItem.connectorKey,
              connectionId: originalConnectionId,
            },
          ],
        });
      });
    });

    describe('getAddConnectionUrl', () => {
      it('should return a URL or null for a connector item', async () => {
        const connections = await service.getAvailableConnections(
          agentId,
          folderId
        );

        if (connections.length === 0) {
          throw new Error(
            'No connector bindings on the test agent — cannot test getAddConnectionUrl.'
          );
        }

        const item = connections[0];
        const url = await service.getAddConnectionUrl(item);

        // url is either a string (auth URL or fallback) or null
        if (url !== null) {
          expect(typeof url).toBe('string');
          expect(url.length).toBeGreaterThan(0);
        }
      });

      it('should fall back to connectionsUrl when auth URL is unavailable', async () => {
        const fallbackUrl = 'https://example.com/connections';
        const url = await service.getAddConnectionUrl({
          connectorKey: 'nonexistent-connector-key',
          connectionsUrl: fallbackUrl,
        });

        expect(url).toBe(fallbackUrl);
      });

      it('should fall back to configurationUrl as last resort', async () => {
        const configUrl = 'https://example.com/config';
        const url = await service.getAddConnectionUrl({
          connectorKey: 'nonexistent-connector-key',
          configurationUrl: configUrl,
        });

        expect(url).toBe(configUrl);
      });

      it('should return null when no URL sources are available', async () => {
        const url = await service.getAddConnectionUrl({
          connectorKey: 'nonexistent-connector-key',
        });

        expect(url).toBeNull();
      });
    });
  }
);
