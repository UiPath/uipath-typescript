import { describe, it, expect, beforeAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  describeIntegration,
  InitMode,
} from '../config/unified-setup';
import type { AuthenticatedUser } from '@/core';
import { GUID_REGEX } from '@/utils/validation/guid';

const modes: InitMode[] = ['v0', 'v1'];

describeIntegration('SDK Initialization - Smoke Tests', 'both', modes, () => {
  describe('Configuration', () => {
    it('should load valid configuration from environment', () => {
      const config = getTestConfig();

      expect(config).toBeDefined();
      expect(config.baseUrl).toBeDefined();
      expect(config.orgName).toBeDefined();
      expect(config.tenantName).toBeDefined();
      expect(config.secret).toBeDefined();
      expect(config.timeout).toBeGreaterThan(0);
    });

    it('should have valid baseUrl format', () => {
      const config = getTestConfig();
      expect(config.baseUrl).toMatch(/^https?:\/\/.+/);
    });
  });

  describe('SDK Instance', () => {
    it('should create SDK instance successfully', () => {
      const { sdk } = getServices();
      expect(sdk).toBeDefined();
    });

    it('should be authenticated', () => {
      const { sdk } = getServices();
      expect(sdk.isAuthenticated()).toBe(true);
    });

    it('should return a valid token that authenticates a request made outside the SDK', async () => {
      const { sdk } = getServices();
      const config = getTestConfig();

      const token = await sdk.getValidToken();
      const response = await fetch(
        `${config.baseUrl}/${config.orgName}/${config.tenantName}/orchestrator_/odata/Folders?$top=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      expect(response.status).toBe(200);
    });
  });

  describe('Service Instantiation', () => {
    it('should have access to Data Fabric services', () => {
      const { entities, choiceSets } = getServices();
      expect(entities).toBeDefined();
      expect(choiceSets).toBeDefined();
      expect(typeof entities.getAll).toBe('function');
    });

    it('should have access to Action Center services', () => {
      const { tasks } = getServices();
      expect(tasks).toBeDefined();
      expect(typeof tasks.getAll).toBe('function');
    });

    it('should have access to Orchestrator services', () => {
      const { assets, buckets, queues, processes } = getServices();
      expect(assets).toBeDefined();
      expect(buckets).toBeDefined();
      expect(queues).toBeDefined();
      expect(processes).toBeDefined();
    });

    it('should have access to Maestro services', () => {
      const { maestroProcesses, processInstances, cases, caseInstances } = getServices();
      expect(maestroProcesses).toBeDefined();
      expect(processInstances).toBeDefined();
      expect(cases).toBeDefined();
      expect(caseInstances).toBeDefined();
    });
  });

  describe('Basic API Connectivity', () => {
    it('should successfully make an API call to Orchestrator', async () => {
      const { queues } = getServices();
      const config = getTestConfig();

      const folderId = config.folderId ? Number(config.folderId) : undefined;
      const result = await queues.getAll({ folderId });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    }, 15000);

    // Data Fabric on the CI tenant answers in seconds normally but queues behind
    // schema DDL from concurrent runs; a connectivity check should outlast that.
    it('should successfully make an API call to Data Fabric', async () => {
      const { entities } = getServices();

      const result = await entities.getAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    }, 60_000);
  });
});

// The user is read from the token's claims, so only a user's token has one; a PAT is opaque.
describeIntegration('SDK Initialization - Authenticated User', 'user', modes, () => {
  let user!: AuthenticatedUser;

  beforeAll(async () => {
    user = await getServices().sdk.getAuthenticatedUser();
  });

  it('should read the signed-in user from the access token', () => {
    expect(user.id).toMatch(GUID_REGEX);
    // The CI user's profile fills these; other users may lack them, hence optional in the type.
    expect(user.name).toBeTruthy();
    expect(user.email).toBeTruthy();
    expect(user.preferredUsername).toBeTruthy();
  });

  it('should return camelCase fields without the raw token claims', () => {
    expect(user).not.toHaveProperty('sub');
    expect(user).not.toHaveProperty('sub_type');
    expect(user).not.toHaveProperty('preferred_username');
    expect(user).not.toHaveProperty('first_name');
    expect(user).not.toHaveProperty('last_name');
  });
});
