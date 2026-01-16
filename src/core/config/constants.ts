/**
 * SDK configuration property keys
 */
export const SDK_CONFIG_KEYS = [
  'clientId',
  'orgName',
  'tenantName',
  'baseUrl',
  'redirectUri',
  'scope',
  'secret'
] as const;

/**
 * Default configuration file name
 */
export const CONFIG_FILE_NAME = 'uipath.json';

/**
 * Default configuration file paths
 */
export const DEFAULT_CONFIG_PATH_BROWSER = `/${CONFIG_FILE_NAME}`;
export const DEFAULT_CONFIG_PATH_NODE = `./${CONFIG_FILE_NAME}`;

/**
 * Meta tag name prefix for UiPath SDK configuration
 */
export const META_TAG_PREFIX = 'uipath:';

/**
 * Mapping from SDK config keys to meta tag names
 */
export const UIPATH_META_TAGS = {
  clientId: 'uipath:client-id',
  scope: 'uipath:scope',
  orgName: 'uipath:org-name',
  tenantName: 'uipath:tenant-name',
  baseUrl: 'uipath:base-url',
  redirectUri: 'uipath:redirect-uri',
} as const;
