/**
 * Default license types applied when deploying a policy to a tenant
 * without specifying explicit license types.
 */
export const DEFAULT_TENANT_LICENSE_TYPES = [
  'Attended',
  'RpaDeveloper',
  'AutomationDeveloper',
  'CitizenDeveloper',
  'Unattended',
] as const;
