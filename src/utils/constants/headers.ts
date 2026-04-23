export const  FOLDER_KEY = 'X-UIPATH-FolderKey';
export const  FOLDER_PATH = 'X-UIPATH-FolderPath';
export const  USER_AGENT = 'X-UIPATH-UserAgent';
export const  TENANT_ID = 'X-UIPATH-Internal-TenantId';
export const  ACCOUNT_ID = 'X-UIPATH-Internal-AccountId';
export const  CORRELATION_ID = 'X-UIPATH-Correlation-Id';
export const  JOB_KEY = 'X-UIPATH-JobKey';
export const  FOLDER_ID = 'X-UIPATH-OrganizationUnitId';
export const  INSTANCE_ID = 'X-UIPATH-InstanceId';

/**
 * Content type constants for HTTP requests/responses
 */
export const CONTENT_TYPES = {
  JSON: 'application/json',
  XML: 'application/xml',
  OCTET_STREAM: 'application/octet-stream'
} as const;

/**
 * Response type constants for HTTP requests
 */
export const RESPONSE_TYPES = {
  JSON: 'json',
  TEXT: 'text',
  BLOB: 'blob',
  ARRAYBUFFER: 'arraybuffer'
} as const;

/**
 * Header key for external user ID (used in both HTTP and WebSocket for external app auth
 * in Conversational Agents Service)
 */
export const EXTERNAL_USER_ID = 'x-uipath-external-user-id';

/**
 * Optional identifier used in UiPath logs to identify the implementing service
 * of requests. External consumers do not need to set it; the server logs
 * missing values as "unknown".
 *
 * @internal Intended for UiPath first-party surfaces.
 */
export const CONVERSATIONAL_SURFACE_NAME = 'x-uipath-conversational-surfacename';
/**
 * Optional version of the implementing service of requests. Paired with
 * `surfaceName` for internal telemetry.
 *
 * @internal Intended for UiPath first-party surfaces.
 */
export const CONVERSATIONAL_SURFACE_VERSION = 'x-uipath-conversational-surfaceversion';

/**
 * Query parameter keys sent during WebSocket connection
 */
export const WEBSOCKET_QUERY_PARAMS = {
  ORGANIZATION_ID: 'x-uipath-internal-accountid',
  TENANT_ID: 'x-uipath-internal-tenantid',
  EXTERNAL_USER_ID,
  CONVERSATIONAL_SURFACE_NAME,
  CONVERSATIONAL_SURFACE_VERSION,
} as const;
