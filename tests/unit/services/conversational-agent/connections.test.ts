// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConversationalAgentService } from '@/services/conversational-agent/conversational-agent';
import { ApiClient } from '@/core/http/api-client';
import {
  createMockError,
  CONVERSATIONAL_AGENT_TEST_CONSTANTS,
  TEST_CONSTANTS,
} from '@tests/utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '@tests/utils/setup';
import { AGENT_ENDPOINTS } from '@/utils/constants/endpoints';
import type {
  AvailableConnection,
  AvailableConnectionsItem,
  AvailableConnectionsResponse,
  ConnectionAuthResponse,
} from '@/models/conversational-agent';

// ===== MOCKING =====
vi.mock('@/core/http/api-client');

vi.mock('@/services/conversational-agent/conversations/session/session-manager', () => ({
  SessionManager: vi.fn().mockImplementation(function () { return ({
    connectionStatus: 'Disconnected',
    isConnected: false,
    connectionError: null,
    onConnectionStatusChanged: vi.fn(() => vi.fn()),
    setLogLevel: vi.fn(),
    setEventDispatcher: vi.fn(),
    emitEvent: vi.fn(),
  }); })
}));

// ===== TEST DATA =====
const AGENT_ID = CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID;
const FOLDER_ID = TEST_CONSTANTS.FOLDER_ID;

const createMockAvailableConnection = (overrides: Partial<AvailableConnection> = {}): AvailableConnection => ({
  id: 'conn-123',
  name: 'My Jira Connection',
  state: 'Enabled',
  isDefault: true,
  personalWorkspace: true,
  folderKey: null,
  folderName: null,
  ...overrides,
});

const createMockConnectionsItem = (overrides: Partial<AvailableConnectionsItem> = {}): AvailableConnectionsItem => ({
  connectorKey: 'jira',
  connectorName: 'Jira',
  connectorImage: 'https://example.com/jira.png',
  resourceKeys: ['binding-1'],
  currentConnectionId: 'conn-123',
  currentConnectionName: 'My Jira Connection',
  configurationUrl: 'https://example.com/configure',
  connectionsUrl: 'https://example.com/connections',
  isConfigurable: true,
  connections: [createMockAvailableConnection()],
  ...overrides,
});

const createMockConnectionsResponse = (
  count: number = 1,
): AvailableConnectionsResponse =>
  Array.from({ length: count }, (_, i) =>
    createMockConnectionsItem({
      connectorKey: `connector-${i}`,
      connectorName: `Connector ${i}`,
    }),
  );

// ===== TEST SUITE =====
describe('ConversationalAgentService — Connections', () => {
  let conversationalAgent: ConversationalAgentService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });

    conversationalAgent = new ConversationalAgentService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── getAvailableConnections ──

  describe('getAvailableConnections', () => {
    it('should call the correct endpoint and return the response', async () => {
      const mockData = createMockConnectionsResponse(2);
      mockApiClient.get.mockResolvedValue(mockData);

      const result = await conversationalAgent.getAvailableConnections(AGENT_ID, FOLDER_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        AGENT_ENDPOINTS.CONNECTIONS(FOLDER_ID, AGENT_ID),
        expect.any(Object),
      );
      expect(result).toHaveLength(2);
      expect(result[0].connectorKey).toBe('connector-0');
      expect(result[1].connectorKey).toBe('connector-1');
    });

    it('should return full connection item fields', async () => {
      const item = createMockConnectionsItem();
      mockApiClient.get.mockResolvedValue([item]);

      const result = await conversationalAgent.getAvailableConnections(AGENT_ID, FOLDER_ID);

      expect(result[0]).toEqual(expect.objectContaining({
        connectorKey: 'jira',
        connectorName: 'Jira',
        connectorImage: 'https://example.com/jira.png',
        resourceKeys: ['binding-1'],
        currentConnectionId: 'conn-123',
        currentConnectionName: 'My Jira Connection',
        isConfigurable: true,
      }));
      expect(result[0].connections).toHaveLength(1);
      expect(result[0].connections[0].id).toBe('conn-123');
    });

    it('should return empty array when no connections exist', async () => {
      mockApiClient.get.mockResolvedValue([]);

      const result = await conversationalAgent.getAvailableConnections(AGENT_ID, FOLDER_ID);

      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      const error = createMockError('Failed to fetch connections');
      mockApiClient.get.mockRejectedValue(error);

      await expect(
        conversationalAgent.getAvailableConnections(AGENT_ID, FOLDER_ID),
      ).rejects.toThrow('Failed to fetch connections');
    });
  });

  // ── updateConnectionSelections ──

  describe('updateConnectionSelections', () => {
    it('should call the correct endpoint with the request body', async () => {
      const updated = createMockConnectionsResponse(1);
      mockApiClient.put.mockResolvedValue(updated);

      const request = {
        selections: [{ connectorKey: 'jira', connectionId: 'conn-456' }],
      };
      const result = await conversationalAgent.updateConnectionSelections(AGENT_ID, FOLDER_ID, request);

      expect(mockApiClient.put).toHaveBeenCalledWith(
        AGENT_ENDPOINTS.CONNECTIONS(FOLDER_ID, AGENT_ID),
        request,
        expect.any(Object),
      );
      expect(result).toHaveLength(1);
    });

    it('should support clearing a connection (connectionId: null)', async () => {
      const updated = [createMockConnectionsItem({ currentConnectionId: null, currentConnectionName: null })];
      mockApiClient.put.mockResolvedValue(updated);

      const request = {
        selections: [{ connectorKey: 'jira', connectionId: null }],
      };
      const result = await conversationalAgent.updateConnectionSelections(AGENT_ID, FOLDER_ID, request);

      expect(result[0].currentConnectionId).toBeNull();
    });

    it('should propagate API errors', async () => {
      const error = createMockError('Failed to update connections');
      mockApiClient.put.mockRejectedValue(error);

      await expect(
        conversationalAgent.updateConnectionSelections(AGENT_ID, FOLDER_ID, {
          selections: [{ connectorKey: 'jira', connectionId: 'conn-456' }],
        }),
      ).rejects.toThrow('Failed to update connections');
    });
  });

  // ── getConnectionAuthUrl ──

  describe('getConnectionAuthUrl', () => {
    it('should call the correct endpoint with the connector key', async () => {
      const mockResponse: ConnectionAuthResponse = {
        authUrl: 'https://auth.example.com/oauth?connector=jira',
        expiresAt: 1700000000,
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await conversationalAgent.getConnectionAuthUrl('jira');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        AGENT_ENDPOINTS.CONNECTION_AUTH,
        { connectorKey: 'jira' },
        expect.any(Object),
      );
      expect(result.authUrl).toBe('https://auth.example.com/oauth?connector=jira');
      expect(result.expiresAt).toBe(1700000000);
    });

    it('should propagate API errors', async () => {
      const error = createMockError('Unauthorized');
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        conversationalAgent.getConnectionAuthUrl('jira'),
      ).rejects.toThrow('Unauthorized');
    });
  });

  // ── getAddConnectionUrl ──

  describe('getAddConnectionUrl', () => {
    it('should return authUrl when getConnectionAuthUrl succeeds', async () => {
      mockApiClient.post.mockResolvedValue({
        authUrl: 'https://auth.example.com/oauth?connector=jira',
        expiresAt: 1700000000,
      });

      const result = await conversationalAgent.getAddConnectionUrl({
        connectorKey: 'jira',
        connectionsUrl: 'https://example.com/connections',
        configurationUrl: 'https://example.com/configure',
      });

      expect(result).toBe('https://auth.example.com/oauth?connector=jira');
    });

    it('should fall back to connectionsUrl when auth URL fails', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Unauthorized'));

      const result = await conversationalAgent.getAddConnectionUrl({
        connectorKey: 'jira',
        connectionsUrl: 'https://example.com/connections',
        configurationUrl: 'https://example.com/configure',
      });

      expect(result).toBe('https://example.com/connections');
    });

    it('should fall back to configurationUrl when both authUrl and connectionsUrl are unavailable', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Unauthorized'));

      const result = await conversationalAgent.getAddConnectionUrl({
        connectorKey: 'jira',
        configurationUrl: 'https://example.com/configure',
      });

      expect(result).toBe('https://example.com/configure');
    });

    it('should return null when all URL sources are unavailable', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Unauthorized'));

      const result = await conversationalAgent.getAddConnectionUrl({
        connectorKey: 'jira',
      });

      expect(result).toBeNull();
    });
  });
});
