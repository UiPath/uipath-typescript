import type {
  ApplyPackOptions,
  CompliancePack,
  PolicyCreateOptions,
  PolicyCreateResponse,
  PolicyDeployOptions,
  PolicySettingsGetResponse,
  RawPolicyGetResponse,
} from './governance.types';

/**
 * Combined type: raw policy data from the API plus bound operational methods.
 */
export type PolicyGetResponse = RawPolicyGetResponse & PolicyMethods;

/**
 * Service for managing UiPath Automation Ops governance policies.
 *
 * Governance policies control which UiPath features and AI capabilities users can
 * access. Policies can be configured with compliance pack settings (ISO 42001, HIPAA,
 * SOC 2, etc.) and deployed to tenants, groups, or individual users.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Governance } from '@uipath/uipath-typescript/governance';
 *
 * const governance = new Governance(sdk);
 * const policies = await governance.getAll();
 * ```
 */
export interface GovernanceServiceModel {
  /**
   * Lists all governance policies in the organization.
   *
   * Returns policy metadata only. To retrieve the settings applied to a specific
   * policy, call `policy.getSettings()` on any item in the result.
   *
   * @returns Promise resolving to an array of {@link PolicyGetResponse} objects
   *
   * @example
   * ```typescript
   * const policies = await governance.getAll();
   * console.log(policies[0].name);
   * console.log(policies[0].product.label);
   * ```
   *
   * @example
   * ```typescript
   * // Find a policy and retrieve its settings
   * const policies = await governance.getAll();
   * const aiPolicy = policies.find(p => p.product.name === 'AITrustLayer');
   * if (aiPolicy) {
   *   const settings = await aiPolicy.getSettings();
   *   console.log(settings.settings);
   * }
   * ```
   */
  getAll(): Promise<PolicyGetResponse[]>;

  /**
   * Creates a new policy shell.
   *
   * A policy shell holds the policy metadata (name, product, priority, availability)
   * but contains no settings. After creation, apply compliance settings using
   * `policy.configure()` on the returned object.
   *
   * > **Note:** If creation fails with a 500 error, create the policy shell manually
   * > in the UI (Automation Ops → Governance → Policies → New Policy) and then use
   * > `getAll()` + `configure()` to apply settings programmatically.
   *
   * @param options - Policy creation options including name, product, and optional metadata
   * @returns Promise resolving to the created {@link PolicyCreateResponse}
   *
   * @example
   * ```typescript
   * const policy = await governance.create({
   *   name: 'ISO42001-AITrustLayer-v1',
   *   product: { name: 'AITrustLayer' },
   *   description: 'ISO 42001:2023 compliance policy',
   *   priority: 1,
   *   availability: 30,
   * });
   * console.log(policy.identifier);
   * ```
   */
  create(options: PolicyCreateOptions): Promise<PolicyCreateResponse>;

  /**
   * Enables robot runtime governance rules (RT-UIA-001, RT-OUT-001).
   *
   * Must be called once before robot runtime governance rules take effect.
   * This is a one-time org-level toggle — subsequent calls are idempotent.
   *
   * @returns Promise that resolves when robot governance is enabled
   *
   * @example
   * ```typescript
   * await governance.enableRobotGovernance();
   * ```
   */
  enableRobotGovernance(): Promise<void>;

  /**
   * Applies a compliance pack to the organization — finds or creates each policy shell,
   * configures it with the pack's settings, and deploys it to the specified target.
   *
   * Policies that already exist are updated in-place. Missing policies are created
   * only when `createIfMissing: true` is set (default: skipped with a warning).
   *
   * @param pack - A compliance pack (e.g. `HIPAA`, `ISO42001`, `EU_AI_ACT`)
   * @param options - Deployment target and creation options
   * @returns Promise that resolves when all policies in the pack are applied
   *
   * @example
   * ```typescript
   * import { HIPAA, Governance } from '@uipath/uipath-typescript/governance';
   *
   * const governance = new Governance(sdk);
   * await governance.applyPack(HIPAA, { deploy: { target: 'tenant' } });
   * ```
   *
   * @example
   * ```typescript
   * import { ISO42001, Governance } from '@uipath/uipath-typescript/governance';
   *
   * // Create missing policy shells and deploy to a group
   * await governance.applyPack(ISO42001, {
   *   deploy: { target: 'group', groupId: '<groupId>' },
   *   createIfMissing: true,
   * });
   * ```
   */
  applyPack(pack: CompliancePack, options: ApplyPackOptions): Promise<void>;
}

/**
 * Methods available on a policy object returned by `getAll()`.
 * These methods operate on the specific policy and capture its identifier automatically.
 */
export interface PolicyMethods {
  /**
   * Retrieves the full settings applied to this policy.
   *
   * @returns Promise resolving to {@link PolicySettingsGetResponse} with a `settings` map
   *
   * @example
   * ```typescript
   * const policies = await governance.getAll();
   * const settings = await policies[0].getSettings();
   * console.log(settings.settings['global-control-toggle']);
   * ```
   */
  getSettings(): Promise<PolicySettingsGetResponse>;

  /**
   * Applies compliance settings to this policy.
   *
   * @param settings - Key-value map of product-specific policy settings.
   *   Keys starting with `_` are treated as documentation and stripped before sending.
   * @returns Promise that resolves when settings are applied
   *
   * @example
   * ```typescript
   * const policies = await governance.getAll();
   * const aiPolicy = policies.find(p => p.product.name === 'AITrustLayer');
   * await aiPolicy.configure({
   *   'global-control-toggle': true,
   *   'agents': false,
   *   'jarvis': false,
   * });
   * ```
   */
  configure(settings: Record<string, unknown>): Promise<void>;

  /**
   * Deploys this policy to a tenant, group, or individual user.
   *
   * @param options - Deployment target options — tenant, group (with groupId), or user (with userId)
   * @returns Promise that resolves when the policy is deployed
   *
   * @example
   * ```typescript
   * const policies = await governance.getAll();
   * const policy = policies[0];
   *
   * // Deploy to entire tenant
   * await policy.deploy({ target: 'tenant' });
   *
   * // Deploy to a specific group
   * await policy.deploy({ target: 'group', groupId: '<groupId>' });
   *
   * // Deploy to a specific user
   * await policy.deploy({ target: 'user', userId: '<userId>' });
   * ```
   */
  deploy(options: PolicyDeployOptions): Promise<void>;
}

/**
 * Creates the bound methods object for a policy.
 * @internal
 */
function createPolicyMethods(
  policyData: RawPolicyGetResponse,
  service: GovernanceServiceModel & {
    getSettings(policyId: string): Promise<PolicySettingsGetResponse>;
    configure(policyData: RawPolicyGetResponse, settings: Record<string, unknown>): Promise<void>;
    deploy(policyId: string, options: PolicyDeployOptions): Promise<void>;
  }
): PolicyMethods {
  return {
    async getSettings(): Promise<PolicySettingsGetResponse> {
      if (!policyData.identifier) throw new Error('Policy identifier is undefined');
      return service.getSettings(policyData.identifier);
    },

    async configure(settings: Record<string, unknown>): Promise<void> {
      if (!policyData.identifier) throw new Error('Policy identifier is undefined');
      return service.configure(policyData, settings);
    },

    async deploy(options: PolicyDeployOptions): Promise<void> {
      if (!policyData.identifier) throw new Error('Policy identifier is undefined');
      return service.deploy(policyData.identifier, options);
    },
  };
}

/**
 * Creates an actionable policy by combining raw API data with bound operational methods.
 *
 * @param policyData - Raw policy data from the API
 * @param service - The governance service instance
 * @returns A policy object with bound methods attached
 */
export function createPolicyWithMethods(
  policyData: RawPolicyGetResponse,
  service: GovernanceServiceModel & {
    getSettings(policyId: string): Promise<PolicySettingsGetResponse>;
    configure(policyData: RawPolicyGetResponse, settings: Record<string, unknown>): Promise<void>;
    deploy(policyId: string, options: PolicyDeployOptions): Promise<void>;
  }
): PolicyGetResponse {
  const methods = createPolicyMethods(policyData, service);
  return Object.assign({}, policyData, methods) as PolicyGetResponse;
}
