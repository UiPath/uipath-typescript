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
 * Default configuration file paths
 */
export const DEFAULT_CONFIG_PATH_BROWSER = '/uipath-config.json';
export const DEFAULT_CONFIG_PATH_NODE = './uipath-config.json';
