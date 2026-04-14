import { track } from '../../core/telemetry';
import { DEFAULT_TENANT_LICENSE_TYPES } from '../../models/governance/governance.constants';
import type { RawPolicySettingsApiResponse, PolicyConfigureRequestBody } from '../../models/governance/governance.internal-types';
import {
  GovernanceServiceModel,
  PolicyGetResponse,
  createPolicyWithMethods,
} from '../../models/governance/governance.models';
import {
  PolicyCreateOptions,
  PolicyCreateResponse,
  PolicyDeployGroupOptions,
  PolicyDeployOptions,
  PolicyDeployUserOptions,
  PolicySettingsGetResponse,
  RawPolicyGetResponse,
} from '../../models/governance/governance.types';
import { GOVERNANCE_ENDPOINTS } from '../../utils/constants/endpoints';
import { BaseService } from '../base';

/**
 * Service for managing UiPath Automation Ops governance policies.
 */
export class GovernanceService extends BaseService implements GovernanceServiceModel {
  /**
   * Lists all governance policies in the organization.
   *
   * @returns Promise resolving to an array of policies with bound methods
   */
  @track('Governance.GetAll')
  async getAll(): Promise<PolicyGetResponse[]> {
    const response = await this.get<RawPolicyGetResponse[]>(
      GOVERNANCE_ENDPOINTS.POLICIES.GET_ALL
    );
    return response.data.map((policy) => createPolicyWithMethods(policy, this));
  }

  /**
   * Retrieves the settings for a specific policy.
   * Called via the bound `policy.getSettings()` method.
   *
   * @param policyId - UUID of the policy
   * @returns Promise resolving to the policy settings
   */
  @track('Governance.GetSettings')
  async getSettings(policyId: string): Promise<PolicySettingsGetResponse> {
    const response = await this.get<RawPolicySettingsApiResponse>(
      GOVERNANCE_ENDPOINTS.POLICIES.GET_SETTINGS(policyId)
    );
    return {
      policyIdentifier: policyId,
      settings: response.data.data?.data ?? {},
    };
  }

  /**
   * Creates a new policy shell.
   *
   * @param options - Policy creation options
   * @returns Promise resolving to the created policy
   */
  @track('Governance.Create')
  async create(options: PolicyCreateOptions): Promise<PolicyCreateResponse> {
    const body = {
      name: options.name,
      description: options.description ?? '',
      product: options.product,
      priority: options.priority ?? 1,
      availability: options.availability ?? 30,
      data: null,
    };
    const response = await this.post<PolicyCreateResponse>(
      GOVERNANCE_ENDPOINTS.POLICIES.CREATE,
      body
    );
    return response.data;
  }

  /**
   * Applies compliance settings to a policy.
   * Called via the bound `policy.configure()` method.
   *
   * @param policyData - Full policy metadata (from getAll response)
   * @param settings - Product-specific settings key-value map
   */
  @track('Governance.Configure')
  async configure(
    policyData: RawPolicyGetResponse,
    settings: Record<string, unknown>
  ): Promise<void> {
    const cleanSettings = this.stripCommentKeys(settings);
    const body: PolicyConfigureRequestBody = {
      policy: {
        name: policyData.name,
        identifier: policyData.identifier,
        description: policyData.description,
        priority: policyData.priority,
        availability: policyData.availability,
        product: policyData.product as unknown as Record<string, unknown>,
        data: null,
      },
      policyFormData: {
        policyIdentifier: policyData.identifier,
        data: {
          data: cleanSettings,
        },
      },
    };
    await this.put<void>(GOVERNANCE_ENDPOINTS.POLICIES.CONFIGURE, body);
  }

  /**
   * Deploys a policy to a tenant, group, or individual user.
   * Called via the bound `policy.deploy()` method.
   *
   * @param policyId - UUID of the policy to deploy
   * @param options - Deployment target and options
   */
  @track('Governance.Deploy')
  async deploy(policyId: string, options: PolicyDeployOptions): Promise<void> {
    switch (options.target) {
      case 'tenant': {
        const body = {
          policyId,
          licenseTypes: options.licenseTypes ?? [...DEFAULT_TENANT_LICENSE_TYPES],
        };
        await this.post<void>(GOVERNANCE_ENDPOINTS.POLICIES.DEPLOY.TENANT, body);
        break;
      }
      case 'group': {
        const { groupId } = options as PolicyDeployGroupOptions;
        await this.post<void>(GOVERNANCE_ENDPOINTS.POLICIES.DEPLOY.GROUP, { policyId, groupId });
        break;
      }
      case 'user': {
        const { userId } = options as PolicyDeployUserOptions;
        await this.post<void>(GOVERNANCE_ENDPOINTS.POLICIES.DEPLOY.USER, { policyId, userId });
        break;
      }
    }
  }

  /**
   * Enables robot runtime governance rules (RT-UIA-001, RT-OUT-001).
   */
  @track('Governance.EnableRobotGovernance')
  async enableRobotGovernance(): Promise<void> {
    await this.post<void>(GOVERNANCE_ENDPOINTS.PRODUCT.ENABLE_ROBOT_GOVERNANCE, {});
  }

  /**
   * Strips keys starting with '_' (used as JSON comment markers in compliance packs).
   */
  private stripCommentKeys(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('_')) continue;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.stripCommentKeys(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
