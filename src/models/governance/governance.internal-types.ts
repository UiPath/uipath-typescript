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
