/**
 * UiPath product controlled by a governance policy.
 */
export interface PolicyProduct {
  /** Internal product identifier (e.g. 'AITrustLayer', 'Development', 'Robot') */
  name: string;
  /** Human-readable product label shown in the Automation Ops UI */
  label: string;
  /** Whether the product requires a special restricted license */
  isRestricted: boolean;
  /** Whether the product runs in UiPath Cloud */
  isCloud: boolean;
  /** Whether the product runs on a remote Robot */
  isRemote: boolean;
}

/**
 * Raw policy object as returned by GET /Policy (list endpoint).
 * Settings are not included — use getSettings() on the policy object to retrieve them.
 */
export interface RawPolicyGetResponse {
  /** Unique policy identifier (UUID) */
  identifier: string;
  /** Policy display name */
  name: string;
  /** Optional policy description */
  description: string | null;
  /**
   * Policy precedence when multiple group-level policies apply to the same user.
   * Lower value = higher precedence.
   */
  priority: number;
  /**
   * Number of days the product caches the policy when it cannot reach Automation Ops.
   */
  availability: number;
  /** UiPath product this policy applies to */
  product: PolicyProduct;
}

/**
 * Policy settings returned by GET /Policy/form-data/{id}.
 * Settings are product-specific key-value pairs.
 */
export interface PolicySettingsGetResponse {
  /** UUID of the policy these settings belong to */
  policyIdentifier: string;
  /**
   * Product-specific settings for this policy.
   * The shape varies by product type (AITrustLayer, Studio, Robot, etc.).
   * See the UiPath Automation Ops documentation for field details per product.
   */
  settings: Record<string, unknown>;
}

/**
 * Options for creating a new policy shell.
 * After creation, apply settings with configure().
 */
export interface PolicyCreateOptions {
  /** Unique display name for the policy */
  name: string;
  /** UiPath product this policy applies to (e.g. { name: 'AITrustLayer' }) */
  product: { name: string };
  /** Optional description */
  description?: string;
  /** Precedence priority — lower = higher precedence. Defaults to 1. */
  priority?: number;
  /** Offline cache duration in days. Defaults to 30. */
  availability?: number;
  /**
   * Initial settings data for the policy shell.
   * When provided, sent as `data: { data: <settings> }` in the POST /Policy body.
   * Use the default template from `POLICY_TEMPLATES[product.name]` to avoid 500 errors
   * caused by the API receiving a null settings object.
   */
  data?: Record<string, unknown>;
}

/**
 * Response returned when a policy shell is created.
 */
export interface PolicyCreateResponse {
  /** UUID of the newly created policy */
  identifier: string;
  /** Display name */
  name: string;
  /** Product this policy applies to */
  product: PolicyProduct;
}

/**
 * Deploy a policy to all users in the tenant.
 */
export interface PolicyDeployTenantOptions {
  target: 'tenant';
  /**
   * License types that should receive this policy.
   * Defaults to all license types when omitted.
   */
  licenseTypes?: PolicyLicenseType[];
}

/**
 * Deploy a policy to all users in a specific group.
 */
export interface PolicyDeployGroupOptions {
  target: 'group';
  /** ID of the group to deploy the policy to */
  groupId: string;
}

/**
 * Deploy a policy to a specific user.
 */
export interface PolicyDeployUserOptions {
  target: 'user';
  /** ID of the user to deploy the policy to */
  userId: string;
}

/** Deployment target options for a governance policy */
export type PolicyDeployOptions =
  | PolicyDeployTenantOptions
  | PolicyDeployGroupOptions
  | PolicyDeployUserOptions;

/**
 * UiPath user license types that can be targeted when deploying a policy to a tenant.
 */
export enum PolicyLicenseType {
  Attended = 'Attended',
  Unattended = 'Unattended',
  RpaDeveloper = 'RpaDeveloper',
  AutomationDeveloper = 'AutomationDeveloper',
  CitizenDeveloper = 'CitizenDeveloper',
  TestingUser = 'TestingUser',
  NonProduction = 'NonProduction',
}

// ─── Compliance Packs ─────────────────────────────────────────────────────────

/**
 * A single policy within a compliance pack — one policy per UiPath product.
 */
export interface CompliancePolicyDef {
  /** Policy name (e.g. 'HIPAA-AITrustLayer-v1') — used to find or create the policy shell */
  name: string;
  /** UiPath product identifier (e.g. 'AITrustLayer', 'Robot', 'Development') */
  product: string;
  /**
   * Settings to apply when configuring this policy.
   * Values are extracted from the rich-object format in the source JSON
   * (the `value` field from each setting definition).
   */
  settings: Record<string, unknown>;
}

/**
 * A compliance pack — a set of pre-configured governance policies for a regulatory framework.
 * Import pre-built packs from `@uipath/uipath-typescript/governance`:
 * `HIPAA`, `ISO42001`, `EU_AI_ACT`, `NIST_AI_RMF`, `SOC2`.
 */
export interface CompliancePack {
  /** Short identifier (e.g. 'HIPAA') */
  id: string;
  /** Human-readable framework name (e.g. 'HIPAA Security Rule') */
  framework: string;
  /** Pack version (e.g. '1.0') */
  version: string;
  /** One policy definition per UiPath product in the framework */
  policies: CompliancePolicyDef[];
}

/**
 * Options for applyPack() — controls whether to create missing policy shells
 * and what happens when creation fails.
 */
export interface ApplyPackOptions {
  /** Deployment target (tenant / group / user). Same options as deploy(). */
  deploy: PolicyDeployOptions;
  /**
   * When true, creates a new policy shell if no matching policy name exists.
   * When false (default), skips policies that don't already exist.
   */
  createIfMissing?: boolean;
}
