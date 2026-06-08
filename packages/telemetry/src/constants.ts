/**
 * Common telemetry attribute keys + Application Insights connection string.
 *
 * Producer-specific identity (SDK version, role name, etc.) is supplied at
 * runtime via `TelemetryClient.initialize(...)` so the same package can be
 * reused by multiple packages. The Application Insights connection string is
 * shared across all consumers and is patched into this file at publish time.
 */

// Connection string placeholder that will be replaced during build
export const CONNECTION_STRING = '$CONNECTION_STRING';

export const VERSION = 'Version';
export const SERVICE = 'Service';
export const CLOUD_ORGANIZATION_NAME = 'CloudOrganizationName';
export const CLOUD_TENANT_NAME = 'CloudTenantName';
export const CLOUD_ORGANIZATION_ID = 'CloudOrganizationId';
export const CLOUD_TENANT_ID = 'CloudTenantId';
export const CLOUD_USER_ID = 'CloudUserId';
export const CLOUD_URL = 'CloudUrl';
export const CLOUD_CLIENT_ID = 'CloudClientId';
export const CLOUD_REDIRECT_URI = 'CloudRedirectUri';
export const APP_NAME = 'ApplicationName';

/** Default value used when an attribute has no resolved value. */
export const UNKNOWN = '';
