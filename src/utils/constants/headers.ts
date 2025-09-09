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
