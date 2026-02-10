import { parseJWT } from '../core/oidc.js';
import inquirer from 'inquirer';
import { getPortalApiUrl } from '../utils/url.js';
import { AUTH_CONSTANTS } from '../../constants/auth.js';
import { createHeaders } from '../../utils/api.js';

export interface Organization {
  id: string;
  name: string;
  displayName?: string;
}

export interface Tenant {
  id: string;
  name: string;
  displayName?: string;
  serviceInstances?: ServiceInstance[];
}

export interface ServiceInstance {
  serviceInstanceId: string;
  serviceInstanceName: string;
  serviceInstanceDisplayName: string;
  serviceUrl: string;
  serviceType: string;
  userRoles?: string[];
}

export interface SelectedTenant {
  tenantId: string;
  tenantName: string;
  tenantDisplayName: string;
  organizationId: string;
  organizationName: string;
  organizationDisplayName: string;
}

interface TenantsAndOrganizationResponse {
  tenants: Tenant[];
  organization: Organization;
}


export const getTenantsAndOrganization = async (
  accessToken: string,
  domain: string
): Promise<TenantsAndOrganizationResponse> => {
  // Parse JWT to get prt_id
  const tokenData = parseJWT(accessToken);
  const prtId = tokenData.prtId || tokenData.organizationId;
  
  if (!prtId) {
    throw new Error('No organization ID found in token');
  }

  const url = getPortalApiUrl(domain, prtId, AUTH_CONSTANTS.API_ENDPOINTS.TENANTS_AND_ORG);
  
  const response = await fetch(url, {
    headers: createHeaders({ bearerToken: accessToken }),
  });

  if (!response.ok) {
    if (response.status === AUTH_CONSTANTS.HTTP_STATUS.UNAUTHORIZED) {
      throw new Error('Unauthorized: Token may be expired');
    }
    throw new Error(`Failed to fetch tenants and organization: ${response.statusText}`);
  }

  const data = await response.json() as TenantsAndOrganizationResponse;
  return data;
};

export const selectTenantInteractive = async (
  data: TenantsAndOrganizationResponse,
  _domain: string
): Promise<SelectedTenant> => {
  if (!data.organization) {
    throw new Error('No organization found');
  }

  if (!data.tenants || data.tenants.length === 0) {
    throw new Error('No tenants found');
  }

  let selectedTenant: Tenant;

  if (data.tenants.length === 1) {
    // Only one tenant, use it automatically
    selectedTenant = data.tenants[0];
  } else {
    // Multiple tenants, prompt user to select
    const { tenantId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'tenantId',
        message: 'Select a tenant',
        choices: data.tenants.map(tenant => ({
          name: tenant.displayName || tenant.name,
          value: tenant.id,
        })),
      },
    ]);

    selectedTenant = data.tenants.find(t => t.id === tenantId) || data.tenants[0];
  }

  return {
    tenantId: selectedTenant.id,
    tenantName: selectedTenant.name,
    tenantDisplayName: selectedTenant.displayName || selectedTenant.name,
    organizationId: data.organization.id,
    organizationName: data.organization.name,
    organizationDisplayName: data.organization.displayName || data.organization.name,
  };
};