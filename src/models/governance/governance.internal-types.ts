/**
 * Full product object as returned by GET /Product.
 * @internal
 */
export interface ProductApiResponse {
  name: string;
  label: string;
  isRestricted: boolean;
  isCloud: boolean;
  isRemote: boolean;
}

/**
 * Raw API response from GET /Policy/form-data/{id}.
 * The settings are nested two levels deep in the API response.
 * @internal
 */
export interface RawPolicySettingsApiResponse {
  policyIdentifier: string;
  data: {
    data: Record<string, unknown>;
  };
}

/**
 * Request body for PUT /Policy (configure endpoint).
 * @internal
 */
export interface PolicyConfigureRequestBody {
  policy: {
    name: string;
    identifier: string;
    description: string | null;
    priority: number;
    availability: number;
    product: Record<string, unknown>;
    data: null;
  };
  policyFormData: {
    policyIdentifier: string;
    data: {
      data: Record<string, unknown>;
    };
  };
}

/**
 * A single row in the tenant policy assignment table.
 * Each row represents one (tenant × product × licenseType) slot.
 * @internal
 */
export interface TenantPolicySlot {
  /** UUID of the tenant */
  tenantIdentifier: string;
  /** Human-readable tenant name — present in GET responses, omitted in PUT body */
  tenantName?: string;
  /** License type identifier (e.g. 'Attended', 'Unattended', 'NoLicense', 'Development') */
  licenseTypeIdentifier: string;
  /** UUID of the policy assigned to this slot, or null if unassigned */
  policyIdentifier: string | null;
  /** Product identifier (e.g. 'AITrustLayer', 'Robot', 'Assistant', 'Development') */
  productIdentifier: string;
}

/**
 * A tenant entry in the GET /Tenant/ response.
 * @internal
 */
export interface TenantEntry {
  name: string;
  identifier: string;
  url: string;
  status: string;
  tenantPolicies: TenantPolicySlot[];
}

/**
 * Response shape from GET /Tenant/.
 * @internal
 */
export interface TenantGetResponse {
  totalCount: number;
  result: TenantEntry[];
}
