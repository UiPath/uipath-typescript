import { track } from '../../core/telemetry';
import { SDKInternalsRegistry } from '../../core/internals';
import type { RawPolicySettingsApiResponse, PolicyConfigureRequestBody, TenantPolicySlot, TenantGetResponse, ProductApiResponse } from '../../models/governance/governance.internal-types';
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
import type { ApplyPackOptions, CompliancePack } from '../../models/governance/governance.types';
import { POLICY_TEMPLATES } from '../../models/governance/policy-templates';
import type { IUiPath } from '../../core/types';
import { BaseService } from '../base';

/**
 * Service for managing UiPath Automation Ops governance policies.
 */
export class GovernanceService extends BaseService implements GovernanceServiceModel {
  private readonly tenantName: string;

  constructor(instance: IUiPath) {
    super(instance);
    this.tenantName = SDKInternalsRegistry.get(instance).config.tenantName;
  }
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
    // The API requires the full product object (label, isRestricted, isCloud, isRemote).
    // Fetch it from GET /Product so we don't send a bare { name } stub.
    const productsResponse = await this.get<ProductApiResponse[]>(GOVERNANCE_ENDPOINTS.PRODUCT.GET_ALL);
    // Compliance packs use legacy names; map them to actual API product identifiers.
    const PRODUCT_ALIASES: Record<string, string> = {
      Studio: 'Development',
      Orchestrator: 'Robot',
    };
    const resolvedName = PRODUCT_ALIASES[options.product.name] ?? options.product.name;
    const fullProduct = productsResponse.data.find(
      p => p.name.toLowerCase() === resolvedName.toLowerCase()
    );
    if (!fullProduct) {
      throw new Error(
        `Product "${options.product.name}" not found — available: ${productsResponse.data.map(p => p.name).join(', ')}`
      );
    }

    // POST /Policy uses the same { policy, policyFormData } structure as PUT /Policy (configure).
    // The settings are included at create time — no separate configure step needed.
    const body = {
      policy: {
        name: options.name,
        description: options.description ?? null,
        product: fullProduct,
        priority: options.priority ?? 1,
        availability: options.availability ?? 30,
      },
      policyFormData: {
        data: {
          data: options.data ?? {},
        },
      },
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
   * For tenant deployment, the API uses a replace-all model: GET the current 19-slot
   * assignment table, set policyIdentifier on all slots matching the policy's product,
   * then PUT the full table back (without tenantName fields).
   *
   * @param policyId - UUID of the policy to deploy
   * @param options - Deployment target and options
   */
  @track('Governance.Deploy')
  async deploy(policyId: string, options: PolicyDeployOptions): Promise<void> {
    switch (options.target) {
      case 'tenant': {
        await this.deployToTenant(policyId);
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
   * Deploys a policy to all product slots for the configured tenant.
   *
   * The governance Tenant API is a replace-all operation:
   * 1. GET /Tenant/ — fetch the full assignment table for all tenants in the org
   * 2. Find the target tenant by name
   * 3. Set policyIdentifier on every slot whose productIdentifier matches the policy's product
   * 4. PUT /Tenant/ with the full modified table (tenantName stripped — API rejects it on write)
   */
  private async deployToTenant(policyId: string): Promise<void> {
    // Step 1: read current policy object to know its product
    const allPolicies = await this.getAll();
    const policy = allPolicies.find(p => p.identifier === policyId);
    if (!policy) {
      throw new Error(`Policy ${policyId} not found — cannot determine product for tenant deployment`);
    }
    const productName = policy.product.name;

    // Step 2: GET the tenant list — response is { totalCount, result: [{ name, identifier, tenantPolicies }] }
    const response = await this.get<TenantGetResponse>(GOVERNANCE_ENDPOINTS.TENANT.POLICIES);
    const tenants = response.data.result;

    // Step 3: Find the tenant matching the configured tenantName
    const tenant = tenants.find(
      t => t.name.toLowerCase() === this.tenantName.toLowerCase()
    );
    if (!tenant) {
      throw new Error(
        `Tenant "${this.tenantName}" not found in governance assignment table. ` +
        `Available tenants: ${tenants.map(t => t.name).join(', ')}`
      );
    }

    // Step 4: Build the modified slot list — set policyIdentifier for slots matching the product,
    // strip tenantName (API rejects it on PUT)
    const updatedSlots = tenant.tenantPolicies.map(({ tenantName: _name, ...slot }) => {
      if (slot.productIdentifier === productName) {
        return { ...slot, policyIdentifier: policyId };
      }
      return slot;
    });

    // Step 5: POST the flat slot array (browser-validated: POST /Tenant/ replaces tenant assignments)
    await this.post<void>(GOVERNANCE_ENDPOINTS.TENANT.POLICIES, updatedSlots);
  }

  /**
   * Enables robot runtime governance rules (RT-UIA-001, RT-OUT-001).
   */
  @track('Governance.EnableRobotGovernance')
  async enableRobotGovernance(): Promise<void> {
    await this.post<void>(GOVERNANCE_ENDPOINTS.PRODUCT.ENABLE_ROBOT_GOVERNANCE, {});
  }

  /**
   * Applies a compliance pack — for each policy definition, finds the matching policy
   * by name (or creates it when createIfMissing is true), configures it with the pack
   * settings, then deploys it to the specified target.
   */
  @track('Governance.ApplyPack')
  async applyPack(pack: CompliancePack, options: ApplyPackOptions): Promise<void> {
    const existing = await this.getAll();
    const byName = new Map(existing.map(p => [p.name.trim(), p]));

    for (const policyDef of pack.policies) {
      let policy = byName.get(policyDef.name);

      if (!policy) {
        if (!options.createIfMissing) {
          console.warn(`[applyPack] "${policyDef.name}" not found — skipping (set createIfMissing: true to create it automatically)`);
          continue;
        }
        console.log(`[applyPack] "${policyDef.name}" — creating...`);
        // Merge template defaults with pack-specific settings so POST /Policy gets complete data.
        const mergedSettings = {
          ...(POLICY_TEMPLATES[policyDef.product] ?? {}),
          ...policyDef.settings,
        };
        try {
          await this.create({
            name: policyDef.name,
            product: { name: policyDef.product },
            priority: 1,
            availability: 30,
            data: mergedSettings,
          });
        } catch (err) {
          console.warn(
            `[applyPack] "${policyDef.name}" — create failed (${err instanceof Error ? err.message : String(err)}). ` +
            `Create the shell manually in Automation Ops → Governance → Policies → New Policy, then re-run.`
          );
          continue;
        }
        const refreshed = await this.getAll();
        policy = refreshed.find(p => p.name.trim() === policyDef.name);
        if (!policy) {
          console.warn(`[applyPack] "${policyDef.name}" — created but not found in policy list, skipping.`);
          continue;
        }
        // Settings already applied during create — skip configure, go straight to deploy.
        console.log(`[applyPack] "${policyDef.name}" — deploying...`);
        await policy.deploy(options.deploy);
        console.log(`[applyPack] "${policyDef.name}" ✓`);
        continue;
      }

      console.log(`[applyPack] "${policyDef.name}" — configuring...`);
      await policy.configure(policyDef.settings);
      console.log(`[applyPack] "${policyDef.name}" — deploying...`);
      await policy.deploy(options.deploy);
      console.log(`[applyPack] "${policyDef.name}" ✓`);
    }
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
