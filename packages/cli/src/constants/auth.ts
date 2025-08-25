export const AUTH_CONSTANTS = {
  DOMAINS: {
    CLOUD: 'cloud',
    ALPHA: 'alpha',
    STAGING: 'staging',
  },
  TIMEOUTS: {
    SERVER_SHUTDOWN_DELAY: 1000,
    AUTH_TIMEOUT: 5 * 60 * 1000,
  },
  CONVERSION: {
    SECONDS_TO_MS: 1000,
  },
  HTTP_STATUS: {
    OK: 200,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
  },
  CONTENT_TYPES: {
    JSON: 'application/json',
    FORM_URLENCODED: 'application/x-www-form-urlencoded',
  },
  ROUTES: {
    OIDC_LOGIN: '/oidc/login',
    TOKEN: '/token',
    ERROR: '/error',
    HEALTH: '/health',
  },
  ERRORS: {
    EADDRINUSE: 'EADDRINUSE',
  },
  OAUTH: {
    GRANT_TYPE: 'authorization_code',
    RESPONSE_TYPE: 'code',
    CODE_CHALLENGE_METHOD: 'S256',
  },
  CRYPTO: {
    RANDOM_BYTES_LENGTH: 32,
  },
  JWT: {
    PARTS_COUNT: 3,
  },
  UI: {
    SKIP_SELECTION: '__skip__',
    SKIP_LABEL: '⏭ Skip folder selection',
    PAGE_SIZE: 10,
  },
  ENV_VARS: {
    ACCESS_TOKEN: 'UIPATH_BEARER_TOKEN',
    BASE_URL: 'UIPATH_BASE_URL',
    TENANT_ID: 'UIPATH_TENANT_ID',
    ORG_ID: 'UIPATH_ORG_ID',
    TENANT_NAME: 'UIPATH_TENANT_NAME',
    ORG_NAME: 'UIPATH_ORG_NAME',
    FOLDER_KEY: 'UIPATH_FOLDER_KEY',
  },
  API_ENDPOINTS: {
    FOLDERS_NAVIGATION: '/FoldersNavigation/GetFolderContext',
    TENANTS_AND_ORG: '/filtering/leftnav/tenantsAndOrganizationInfo',
  },
  DEFAULT_PORT: 8104,
  ALTERNATIVE_PORTS: [8104, 8055, 42042],
  RATE_LIMIT: {
    WINDOW_MS: 60 * 1000, // 1 minute
    AUTH_MAX_REQUESTS: 10,
    TOKEN_MAX_REQUESTS: 5,
    ERROR_MAX_REQUESTS: 20,
  },
  CORS: {
    HEADERS: {
      ALLOW_ORIGIN: 'Access-Control-Allow-Origin',
      ALLOW_METHODS: 'Access-Control-Allow-Methods',
      ALLOW_HEADERS: 'Access-Control-Allow-Headers',
    },
    VALUES: {
      ORIGIN: '*',
      METHODS: 'GET, POST, OPTIONS',
      HEADERS: 'Content-Type',
    },
  },
} as const;

export const BASE_URLS: Record<string, string> = {
  alpha: 'https://alpha.uipath.com',
  cloud: 'https://cloud.uipath.com',
  staging: 'https://staging.uipath.com',
} as const;

export const CLIENT_IDS: Record<string, string> = {
  default: '36dea5b8-e8bb-423d-8e7b-c808df8f1c00',
} as const;