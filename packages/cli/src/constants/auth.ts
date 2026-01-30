export const AUTH_CONSTANTS = {
  // File and directory names
  FILES: {
    UIPATH_DIR: '.uipath',
    APP_CONFIG: 'app.config.json',
    AUTH_FILE: '.auth.json',
    ENV_FILE: '.env',
    METADATA_FILE: 'metadata.json',
  },
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
    TEXT_HTML: 'text/html',
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
    GRANT_TYPE_CLIENT_CREDENTIALS: 'client_credentials',
    RESPONSE_TYPE: 'code',
    CODE_CHALLENGE_METHOD: 'S256',
    DEFAULT_CLIENT_ID: '36dea5b8-e8bb-423d-8e7b-c808df8f1c00',
    REDIRECT_URI_TEMPLATE: 'http://localhost:{PORT}/oidc/login',
    DEFAULT_SCOPE: 'offline_access ProcessMining OrchestratorApiUserAccess StudioWebBackend IdentityServerApi ConnectionService DataService DocumentUnderstanding EnterpriseContextService Directory JamJamApi LLMGateway LLMOps OMS RCS.FolderAuthorization TM.Projects TM.TestCases TM.Requirements TM.TestSets',
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

  // Environment variable configuration
  ENV_CONFIG: {
    BASE_URL: {
      envVar: 'UIPATH_BASE_URL',
      configKey: 'baseUrl' as const,
      flag: '--baseUrl',
      example: "'https://cloud.uipath.com'",
    },
    ORG_ID: {
      envVar: 'UIPATH_ORG_ID',
      configKey: 'orgId' as const,
      flag: '--orgId',
      example: "'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'",
    },
    TENANT_ID: {
      envVar: 'UIPATH_TENANT_ID',
      configKey: 'tenantId' as const,
      flag: '--tenantId',
      example: "'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'",
    },
    TENANT_NAME: {
      envVar: 'UIPATH_TENANT_NAME',
      configKey: 'tenantName' as const,
      flag: '--tenantName',
      example: "'YourTenantName'",
    },
    FOLDER_KEY: {
      envVar: 'UIPATH_FOLDER_KEY',
      configKey: 'folderKey' as const,
      flag: '--folderKey',
      example: "'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'",
    },
    ACCESS_TOKEN: {
      envVar: 'UIPATH_ACCESS_TOKEN',
      configKey: 'accessToken' as const,
      flag: '--accessToken',
      example: "'your-access-token'",
    },
    ORG_NAME: {
      envVar: 'UIPATH_ORG_NAME',
      configKey: 'orgName' as const,
      flag: '--orgName',
      example: "'YourOrgName'",
    },
  },
  REQUIRED_ENV_VARS: {
    // Required for register app command
    REGISTER_APP: [
      'UIPATH_BASE_URL',
      'UIPATH_ORG_ID',
      'UIPATH_TENANT_ID',
      'UIPATH_TENANT_NAME',
      'UIPATH_FOLDER_KEY',
      'UIPATH_ACCESS_TOKEN'
    ],
    // Required for publish command (no folder key or tenant name needed)
    PUBLISH: [
      'UIPATH_BASE_URL',
      'UIPATH_ORG_ID',
      'UIPATH_TENANT_ID',
      'UIPATH_ACCESS_TOKEN'
    ],
    // Required for deploy command
    DEPLOY: [
      'UIPATH_BASE_URL',
      'UIPATH_ORG_ID',
      'UIPATH_TENANT_ID',
      'UIPATH_FOLDER_KEY',
      'UIPATH_ACCESS_TOKEN'
    ],
    // Required for push command (Studio Web)
    PUSH: [
      'UIPATH_BASE_URL',
      'UIPATH_ORG_ID',
      'UIPATH_TENANT_ID',
      'UIPATH_ACCESS_TOKEN'
    ],
  },
  API_ENDPOINTS: {
    FOLDERS_NAVIGATION: '/Folders/GetAllForCurrentUser',
    TENANTS_AND_ORG: '/filtering/leftnav/tenantsAndOrganizationInfo',
  },
  IDENTITY_ENDPOINTS: {
    AUTHORIZE: '/identity_/connect/authorize',
    TOKEN: '/identity_/connect/token',
  },
  SERVICE_PATHS: {
    PORTAL_API: '/portal_/api',
    ORCHESTRATOR_API: '/orchestrator_/api',
  },
  DEFAULT_PORT: 8104,
  ALTERNATIVE_PORTS: [8104, 8055, 42042],
  PORT_CHECK_HOSTS: ['localhost', '127.0.0.1', '::1'],
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
      ORIGIN: 'null', // Will be dynamically set to localhost origins only
      METHODS: 'GET, POST, OPTIONS',
      HEADERS: 'Content-Type',
    },
    ALLOWED_ORIGINS: [
      'http://localhost',
      'http://127.0.0.1',
      'https://localhost',
      'https://127.0.0.1',
    ],
  },
} as const;

export const BASE_URLS: Record<string, string> = {
  alpha: 'https://alpha.uipath.com',
  cloud: 'https://cloud.uipath.com',
  staging: 'https://staging.uipath.com',
} as const;