import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GovernanceService } from '../../../../src/services/governance/governance';
import { ApiClient } from '../../../../src/core/http/api-client';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { createMockError } from '../../../utils/mocks/core';
import { createMockRawPolicy, createMockRawPolicySettings } from '../../../utils/mocks/governance';
import { GOVERNANCE_TEST_CONSTANTS } from '../../../utils/constants/governance';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { GOVERNANCE_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { PolicyLicenseType } from '../../../../src/models/governance/governance.types';

vi.mock('../../../../src/core/http/api-client');

describe('GovernanceService Unit Tests', () => {
  let governanceService: GovernanceService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);
    governanceService = new GovernanceService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── getAll ───────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('should return list of policies with bound methods', async () => {
      const mockPolicy = createMockRawPolicy();
      mockApiClient.get.mockResolvedValue([mockPolicy]);

      const result = await governanceService.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].identifier).toBe(GOVERNANCE_TEST_CONSTANTS.POLICY_ID);
      expect(result[0].name).toBe(GOVERNANCE_TEST_CONSTANTS.POLICY_NAME);
      expect(result[0].product.label).toBe(GOVERNANCE_TEST_CONSTANTS.PRODUCT_LABEL);
      expect(typeof result[0].getSettings).toBe('function');
      expect(typeof result[0].configure).toBe('function');
      expect(typeof result[0].deploy).toBe('function');
    });

    it('should call GET /Policy endpoint', async () => {
      mockApiClient.get.mockResolvedValue([]);

      await governanceService.getAll();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        GOVERNANCE_ENDPOINTS.POLICIES.GET_ALL,
        expect.any(Object)
      );
    });

    it('should propagate errors from the API', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(governanceService.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  // ─── getSettings ──────────────────────────────────────────────────────────

  describe('getSettings', () => {
    it('should return unwrapped policy settings', async () => {
      const mockSettings = createMockRawPolicySettings();
      mockApiClient.get.mockResolvedValue(mockSettings);

      const result = await governanceService.getSettings(GOVERNANCE_TEST_CONSTANTS.POLICY_ID);

      expect(result.policyIdentifier).toBe(GOVERNANCE_TEST_CONSTANTS.POLICY_ID);
      expect(result.settings[GOVERNANCE_TEST_CONSTANTS.SETTINGS_KEY]).toBe(
        GOVERNANCE_TEST_CONSTANTS.SETTINGS_VALUE
      );
      expect(result.settings['agents']).toBe(true);
    });

    it('should call form-data endpoint with correct policy ID', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawPolicySettings());

      await governanceService.getSettings(GOVERNANCE_TEST_CONSTANTS.POLICY_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        GOVERNANCE_ENDPOINTS.POLICIES.GET_SETTINGS(GOVERNANCE_TEST_CONSTANTS.POLICY_ID),
        expect.any(Object)
      );
    });

    it('should propagate errors from the API', async () => {
      mockApiClient.get.mockRejectedValue(
        createMockError(GOVERNANCE_TEST_CONSTANTS.ERROR_POLICY_NOT_FOUND)
      );

      await expect(
        governanceService.getSettings(GOVERNANCE_TEST_CONSTANTS.POLICY_ID)
      ).rejects.toThrow(GOVERNANCE_TEST_CONSTANTS.ERROR_POLICY_NOT_FOUND);
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a policy shell with correct body', async () => {
      const createResponse = {
        identifier: GOVERNANCE_TEST_CONSTANTS.POLICY_ID,
        name: GOVERNANCE_TEST_CONSTANTS.POLICY_NAME,
        product: { name: GOVERNANCE_TEST_CONSTANTS.PRODUCT_NAME, label: GOVERNANCE_TEST_CONSTANTS.PRODUCT_LABEL, isRestricted: false, isCloud: true, isRemote: false },
      };
      mockApiClient.post.mockResolvedValue(createResponse);

      const result = await governanceService.create({
        name: GOVERNANCE_TEST_CONSTANTS.POLICY_NAME,
        product: { name: GOVERNANCE_TEST_CONSTANTS.PRODUCT_NAME },
        description: GOVERNANCE_TEST_CONSTANTS.POLICY_DESCRIPTION,
        priority: GOVERNANCE_TEST_CONSTANTS.POLICY_PRIORITY,
        availability: GOVERNANCE_TEST_CONSTANTS.POLICY_AVAILABILITY,
      });

      expect(result.identifier).toBe(GOVERNANCE_TEST_CONSTANTS.POLICY_ID);
      expect(result.name).toBe(GOVERNANCE_TEST_CONSTANTS.POLICY_NAME);
    });

    it('should apply defaults for priority and availability when not provided', async () => {
      mockApiClient.post.mockResolvedValue({
        identifier: GOVERNANCE_TEST_CONSTANTS.POLICY_ID,
        name: GOVERNANCE_TEST_CONSTANTS.POLICY_NAME,
        product: { name: GOVERNANCE_TEST_CONSTANTS.PRODUCT_NAME },
      });

      await governanceService.create({
        name: GOVERNANCE_TEST_CONSTANTS.POLICY_NAME,
        product: { name: GOVERNANCE_TEST_CONSTANTS.PRODUCT_NAME },
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        GOVERNANCE_ENDPOINTS.POLICIES.CREATE,
        expect.objectContaining({ priority: 1, availability: 30, data: null }),
        expect.any(Object)
      );
    });

    it('should propagate errors from the API', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        governanceService.create({
          name: GOVERNANCE_TEST_CONSTANTS.POLICY_NAME,
          product: { name: GOVERNANCE_TEST_CONSTANTS.PRODUCT_NAME },
        })
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  // ─── configure ────────────────────────────────────────────────────────────

  describe('configure', () => {
    it('should PUT policy with correct body structure', async () => {
      mockApiClient.put.mockResolvedValue(undefined);
      const policyData = createMockRawPolicy();
      const settings = { 'global-control-toggle': true, agents: false };

      await governanceService.configure(policyData, settings);

      expect(mockApiClient.put).toHaveBeenCalledWith(
        GOVERNANCE_ENDPOINTS.POLICIES.CONFIGURE,
        expect.objectContaining({
          policy: expect.objectContaining({
            identifier: GOVERNANCE_TEST_CONSTANTS.POLICY_ID,
            name: GOVERNANCE_TEST_CONSTANTS.POLICY_NAME,
            data: null,
          }),
          policyFormData: expect.objectContaining({
            policyIdentifier: GOVERNANCE_TEST_CONSTANTS.POLICY_ID,
            data: { data: settings },
          }),
        }),
        expect.any(Object)
      );
    });

    it('should strip keys starting with _ before sending to API', async () => {
      mockApiClient.put.mockResolvedValue(undefined);
      const policyData = createMockRawPolicy();
      const settings = {
        '_comment': 'ISO clause 8.6',
        '_product': 'AITrustLayer',
        'global-control-toggle': true,
        agents: false,
      };

      await governanceService.configure(policyData, settings);

      const calledBody = mockApiClient.put.mock.calls[0][1];
      const sentSettings = calledBody.policyFormData.data.data;
      expect(sentSettings).not.toHaveProperty('_comment');
      expect(sentSettings).not.toHaveProperty('_product');
      expect(sentSettings['global-control-toggle']).toBe(true);
    });

    it('should propagate errors from the API', async () => {
      mockApiClient.put.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        governanceService.configure(createMockRawPolicy(), { agents: false })
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  // ─── deploy ───────────────────────────────────────────────────────────────

  describe('deploy', () => {
    it('should deploy to tenant with default license types when none provided', async () => {
      mockApiClient.post.mockResolvedValue(undefined);

      await governanceService.deploy(GOVERNANCE_TEST_CONSTANTS.POLICY_ID, { target: 'tenant' });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        GOVERNANCE_ENDPOINTS.POLICIES.DEPLOY.TENANT,
        expect.objectContaining({
          policyId: GOVERNANCE_TEST_CONSTANTS.POLICY_ID,
          licenseTypes: expect.arrayContaining(['Attended', 'Unattended']),
        }),
        expect.any(Object)
      );
    });

    it('should deploy to tenant with specified license types', async () => {
      mockApiClient.post.mockResolvedValue(undefined);
      const licenseTypes = [PolicyLicenseType.Attended, PolicyLicenseType.Unattended];

      await governanceService.deploy(GOVERNANCE_TEST_CONSTANTS.POLICY_ID, {
        target: 'tenant',
        licenseTypes,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        GOVERNANCE_ENDPOINTS.POLICIES.DEPLOY.TENANT,
        expect.objectContaining({ licenseTypes }),
        expect.any(Object)
      );
    });

    it('should deploy to group', async () => {
      mockApiClient.post.mockResolvedValue(undefined);

      await governanceService.deploy(GOVERNANCE_TEST_CONSTANTS.POLICY_ID, {
        target: 'group',
        groupId: GOVERNANCE_TEST_CONSTANTS.GROUP_ID,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        GOVERNANCE_ENDPOINTS.POLICIES.DEPLOY.GROUP,
        { policyId: GOVERNANCE_TEST_CONSTANTS.POLICY_ID, groupId: GOVERNANCE_TEST_CONSTANTS.GROUP_ID },
        expect.any(Object)
      );
    });

    it('should deploy to user', async () => {
      mockApiClient.post.mockResolvedValue(undefined);

      await governanceService.deploy(GOVERNANCE_TEST_CONSTANTS.POLICY_ID, {
        target: 'user',
        userId: GOVERNANCE_TEST_CONSTANTS.USER_ID,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        GOVERNANCE_ENDPOINTS.POLICIES.DEPLOY.USER,
        { policyId: GOVERNANCE_TEST_CONSTANTS.POLICY_ID, userId: GOVERNANCE_TEST_CONSTANTS.USER_ID },
        expect.any(Object)
      );
    });

    it('should propagate errors from the API', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        governanceService.deploy(GOVERNANCE_TEST_CONSTANTS.POLICY_ID, { target: 'tenant' })
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  // ─── enableRobotGovernance ────────────────────────────────────────────────

  describe('enableRobotGovernance', () => {
    it('should POST to enable robot governance endpoint', async () => {
      mockApiClient.post.mockResolvedValue(undefined);

      await governanceService.enableRobotGovernance();

      expect(mockApiClient.post).toHaveBeenCalledWith(
        GOVERNANCE_ENDPOINTS.PRODUCT.ENABLE_ROBOT_GOVERNANCE,
        {},
        expect.any(Object)
      );
    });

    it('should propagate errors from the API', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(governanceService.enableRobotGovernance()).rejects.toThrow(
        TEST_CONSTANTS.ERROR_MESSAGE
      );
    });
  });
});
