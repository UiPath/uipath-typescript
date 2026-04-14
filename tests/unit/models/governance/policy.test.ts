import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createPolicyWithMethods,
  GovernanceServiceModel,
} from '../../../../src/models/governance/governance.models';
import { createMockRawPolicy, createMockRawPolicySettings } from '../../../utils/mocks/governance';
import { GOVERNANCE_TEST_CONSTANTS } from '../../../utils/constants/governance';
import type {
  PolicyDeployOptions,
  PolicySettingsGetResponse,
  RawPolicyGetResponse,
} from '../../../../src/models/governance/governance.types';

// Extended service interface for bound method delegation tests
type MockGovernanceService = GovernanceServiceModel & {
  getSettings(policyId: string): Promise<PolicySettingsGetResponse>;
  configure(policyData: RawPolicyGetResponse, settings: Record<string, unknown>): Promise<void>;
  deploy(policyId: string, options: PolicyDeployOptions): Promise<void>;
};

describe('Policy Models', () => {
  let mockService: MockGovernanceService;

  beforeEach(() => {
    mockService = {
      getAll: vi.fn(),
      create: vi.fn(),
      enableRobotGovernance: vi.fn(),
      getSettings: vi.fn(),
      configure: vi.fn(),
      deploy: vi.fn(),
    } as unknown as MockGovernanceService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createPolicyWithMethods', () => {
    it('should attach getSettings, configure and deploy to the policy object', () => {
      const raw = createMockRawPolicy();
      const policy = createPolicyWithMethods(raw, mockService);

      expect(typeof policy.getSettings).toBe('function');
      expect(typeof policy.configure).toBe('function');
      expect(typeof policy.deploy).toBe('function');
    });

    it('should preserve all raw data fields', () => {
      const raw = createMockRawPolicy();
      const policy = createPolicyWithMethods(raw, mockService);

      expect(policy.identifier).toBe(GOVERNANCE_TEST_CONSTANTS.POLICY_ID);
      expect(policy.name).toBe(GOVERNANCE_TEST_CONSTANTS.POLICY_NAME);
      expect(policy.description).toBe(GOVERNANCE_TEST_CONSTANTS.POLICY_DESCRIPTION);
      expect(policy.priority).toBe(GOVERNANCE_TEST_CONSTANTS.POLICY_PRIORITY);
      expect(policy.availability).toBe(GOVERNANCE_TEST_CONSTANTS.POLICY_AVAILABILITY);
      expect(policy.product.name).toBe(GOVERNANCE_TEST_CONSTANTS.PRODUCT_NAME);
    });
  });

  describe('bound method: policy.getSettings()', () => {
    it('should delegate to service.getSettings with captured identifier', async () => {
      const mockSettings: PolicySettingsGetResponse = {
        policyIdentifier: GOVERNANCE_TEST_CONSTANTS.POLICY_ID,
        settings: createMockRawPolicySettings().data.data,
      };
      mockService.getSettings = vi.fn().mockResolvedValue(mockSettings);

      const raw = createMockRawPolicy();
      const policy = createPolicyWithMethods(raw, mockService);

      const result = await policy.getSettings();

      expect(mockService.getSettings).toHaveBeenCalledWith(GOVERNANCE_TEST_CONSTANTS.POLICY_ID);
      expect(result.settings[GOVERNANCE_TEST_CONSTANTS.SETTINGS_KEY]).toBe(
        GOVERNANCE_TEST_CONSTANTS.SETTINGS_VALUE
      );
    });

    it('should throw if policy identifier is missing', async () => {
      const raw = createMockRawPolicy({ identifier: '' });
      const policy = createPolicyWithMethods(raw, mockService);

      await expect(policy.getSettings()).rejects.toThrow('Policy identifier is undefined');
    });
  });

  describe('bound method: policy.configure()', () => {
    it('should delegate to service.configure with captured policy data', async () => {
      mockService.configure = vi.fn().mockResolvedValue(undefined);
      const settings = { 'global-control-toggle': true, agents: false };

      const raw = createMockRawPolicy();
      const policy = createPolicyWithMethods(raw, mockService);

      await policy.configure(settings);

      expect(mockService.configure).toHaveBeenCalledWith(raw, settings);
    });

    it('should throw if policy identifier is missing', async () => {
      const raw = createMockRawPolicy({ identifier: '' });
      const policy = createPolicyWithMethods(raw, mockService);

      await expect(policy.configure({ agents: false })).rejects.toThrow(
        'Policy identifier is undefined'
      );
    });
  });

  describe('bound method: policy.deploy()', () => {
    it('should delegate to service.deploy with captured identifier for tenant target', async () => {
      mockService.deploy = vi.fn().mockResolvedValue(undefined);

      const raw = createMockRawPolicy();
      const policy = createPolicyWithMethods(raw, mockService);
      const options: PolicyDeployOptions = { target: 'tenant' };

      await policy.deploy(options);

      expect(mockService.deploy).toHaveBeenCalledWith(GOVERNANCE_TEST_CONSTANTS.POLICY_ID, options);
    });

    it('should delegate to service.deploy for group target', async () => {
      mockService.deploy = vi.fn().mockResolvedValue(undefined);

      const raw = createMockRawPolicy();
      const policy = createPolicyWithMethods(raw, mockService);
      const options: PolicyDeployOptions = {
        target: 'group',
        groupId: GOVERNANCE_TEST_CONSTANTS.GROUP_ID,
      };

      await policy.deploy(options);

      expect(mockService.deploy).toHaveBeenCalledWith(GOVERNANCE_TEST_CONSTANTS.POLICY_ID, options);
    });

    it('should throw if policy identifier is missing', async () => {
      const raw = createMockRawPolicy({ identifier: '' });
      const policy = createPolicyWithMethods(raw, mockService);

      await expect(policy.deploy({ target: 'tenant' })).rejects.toThrow(
        'Policy identifier is undefined'
      );
    });
  });
});
