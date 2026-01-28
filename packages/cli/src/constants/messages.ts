import { AUTH_CONSTANTS } from './auth.js';

/**
 * Config file name constant
 */
export const CONFIG_FILE_NAME = 'uipath.json';

/**
 * Common CLI error and success messages
 */
export const MESSAGES = {
  ERRORS: {
    // File/Directory validation
    INVALID_DIST_DIRECTORY: 'Invalid dist directory',
    PACKAGE_NAME_REQUIRED: 'Package name is required',
    ACTION_SCHEMA_REQUIRED: '❌ action-schema.json file not found in current working directory',
    
    // Authentication & Authorization
    AUTHENTICATION_FAILED: 'Authentication failed. Please check your UIPATH_ACCESS_TOKEN, run "uipath auth" to authenticate, or pass credentials via CLI flags',
    ACCESS_DENIED: 'Access denied. You may not have permission to access this tenant/organization',
    API_ENDPOINT_NOT_FOUND: 'API endpoint not found. Please check your UIPATH_BASE_URL configuration',
    
    // Server errors
    SERVER_ERROR: 'Server error occurred. Please try again later or contact UiPath support',
    SERVICES_UNAVAILABLE: 'UiPath services are temporarily unavailable. Please try again later',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please wait and try again',
    PAYLOAD_TOO_LARGE: 'Request payload is too large',
    
    // Generic
    UNKNOWN_ERROR: 'Unknown error occurred',
    NO_ERROR_DETAILS: 'No additional error details provided',
    
    // Detailed log messages (used after spinner.fail)
    PACKAGING_ERROR_PREFIX: 'Packaging error:',
    PUBLISHING_ERROR_PREFIX: 'Publishing error:',
    DEPLOYMENT_ERROR_PREFIX: 'Deployment error:',
    
    // Debug messages
    FAILED_TO_LOAD_APP_CONFIG: 'Failed to load app config:',
    
    // Operation-specific
    PACKAGE_CREATION_FAILED: '❌ Package creation failed',
    PACKAGE_PUBLISHING_FAILED: '❌ Package publishing failed',
    AUTHENTICATION_PROCESS_FAILED: '❌ Authentication failed',
    LOGOUT_FAILED: '❌ Failed to logout',
    FAILED_TO_FETCH_ORG_TENANT: '❌ Failed to fetch organization/tenant information',
    APP_DEPLOYMENT_FAILED: '❌ App deployment failed',
    APP_UPGRADE_FAILED: '❌ App upgrade failed',
    APP_NOT_PUBLISHED: '❌ App has not been published yet. Run "uipath register app" first',
    APP_NAME_ALREADY_EXISTS: '❌ This app name is already deployed in this folder. Please choose a different name.',
    DEPLOYMENT_ID_NOT_FOUND: '❌ Could not find deployment ID for the app',
    
    // Ports
    ALL_REGISTERED_PORTS_IN_USE: 'All registered ports are in use',
    ALL_PORTS_IN_USE: 'All registered ports are in use. Please free up one of the ports listed above and try again.',
    PORTS_CURRENTLY_IN_USE: 'are currently in use.',
    FREE_UP_PORTS_INSTRUCTION: 'Please free up one of these ports by stopping applications running on them:',
    
    // Package-specific
    NO_NUPKG_FILES_FOUND: '❌ No .nupkg files found',
    UIPATH_DIR_NOT_FOUND: '❌ .uipath directory not found',
    PACKAGE_TOO_LARGE: '❌ Package file is too large for upload',
    PACKAGE_UPLOAD_FAILED: 'Package upload failed: An error occured',
    CONFIG_FILE_NOT_FOUND: `❌ ${AUTH_CONSTANTS.FILES.SDK_CONFIG} not found in project root`,
    CONFIG_FILE_INVALID_JSON: `❌ ${AUTH_CONSTANTS.FILES.SDK_CONFIG} is not valid JSON`,
    CONFIG_FILE_MISSING_SCOPE: `❌ ${AUTH_CONSTANTS.FILES.SDK_CONFIG} is missing required "scope" field`,
    CONFIG_FILE_SCOPE_REQUIRED_HINT: 'The scope field is required for OAuth client creation during deployment.',
    SCOPE_VALIDATION_ERROR: 'Scope is required for OAuth client creation during deployment.',
    
    // Command-specific
    UNKNOWN_FLAG: '✗ Error: Unknown flag',
    UNKNOWN_COMMAND: '✗ Error: Unknown command',
    
    // File operations
    FAILED_TO_UPDATE_ENV: 'Failed to update .env file:',
    MANUAL_ENV_INSTRUCTION: 'Please add the following to your .env file manually:',
    FAILED_TO_SAVE_APP_CONFIG: 'Failed to save app configuration:',
    FAILED_TO_PARSE_ACTION_SCHEMA: 'Failed to parse Action Schema:',

    //Action schema validations
    INVALID_PROPERTY_TYPE: 'Invalid type. Must be one of: string, integer, number, boolean, array, object',
    INVALID_PROPERTY_FORMAT: 'Invalid format. Must be one of: uuid, date',
    MISSING_ITEMS_ARRAY: 'Array properties must have an "items" field',
    NESTED_ARRAYS_NOT_SUPPORTED: 'Nested arrays are not allowed. Array items cannot be of type array',
    SECTION_TYPE_INVALID: 'Section type must be "object"',
    INVALID_PROPERTIES_OBJECT: 'Properties must be a valid object',
    MISSING_ACTION_SCHEMA_SECTION: 'Action schema must have inputs, outputs, inOuts, and outcomes sections',
    INVALID_ACTION_SCHEMA: 'Action schema validation failed:',
    UNSUPPORTED_JSON_DATA_TYPE: 'Unsupported JSON data type:'

  },
  
  SUCCESS: {
    // Authentication
    ALREADY_AUTHENTICATED: '✓ Already authenticated',
    AUTHENTICATION_SUCCESS: '✓ Successfully authenticated',
    LOGOUT_SUCCESS: 'Successfully logged out',
    
    // Packaging
    PACKAGE_CREATED_SUCCESS: 'NuGet package created successfully!',
    PACKAGE_CONFIG_VALIDATED: '✅ Package configuration validated',
    CONFIG_FILE_INCLUDED: `✅ Included ${AUTH_CONSTANTS.FILES.SDK_CONFIG} in package`,
    CONFIG_FILE_CREATED: `✅ Created ${AUTH_CONSTANTS.FILES.SDK_CONFIG} with provided scopes`,
    CLIENT_ID_CLEARED: '✅ ClientId cleared - UiPath will create a new OAuth client during deployment',
    CLIENT_ID_REUSED: '✅ Existing clientId will be reused in production',
    
    // Publishing
    PACKAGE_PUBLISHED_SUCCESS: '✅ Package published successfully!',
    PACKAGE_UPLOADED_SUCCESS: '✅ Package uploaded to Orchestrator',
    CODED_APP_REGISTERED_SUCCESS: '✅ Coded app registered successfully!',

    // Deployment
    APP_DEPLOYED_SUCCESS: '✅ App deployed successfully!',
    APP_UPGRADED_SUCCESS: '✅ App upgraded successfully!',
  },
  
  INFO: {
    // Spinners/Progress
    CHECKING_APP_NAME_UNIQUENESS: 'Checking app name availability...',
    DEPLOYING_APP: 'Deploying app...',
    UPGRADING_APP: 'Upgrading app to latest version...',
    CHECKING_DEPLOYMENT_STATUS: 'Checking deployment status...',
    CREATING_PACKAGE: 'Creating NuGet package...',
    CREATING_METADATA_FILES: 'Creating metadata files...',
    CREATING_NUPKG_PACKAGE: 'Creating .nupkg package...',
    PUBLISHING_PACKAGE: 'Publishing package to UiPath Orchestrator...',
    UPLOADING_PACKAGE: 'Uploading package to Orchestrator...',
    REGISTERING_CODED_APP: 'Registering coded app...',
    PACKAGE_ALREADY_EXISTS: 'ℹ Package already exists in Orchestrator, proceeding to registration...',
    FINDING_PORT: 'Finding available port...',
    STARTING_AUTH_PROCESS: 'Starting authentication process...',
    STARTING_AUTH_SERVER: 'Starting local authentication server...',
    OPENING_BROWSER: 'Opening browser for authentication...',
    WAITING_FOR_AUTH: 'Waiting for authentication...',
    FETCHING_ORG_TENANTS: 'Fetching organization and tenants...',
    LOGGING_OUT: 'Logging out...',
    AUTHENTICATING_WITH_CLIENT_CREDENTIALS: 'Authenticating with client credentials...',
    
    // Tips
    RUN_PACK_FIRST: '💡 Run "uipath pack" first to create a package',
    RUN_WITHOUT_DRY_RUN: '💡 Run without --dry-run to create the package',
    USE_PUBLISH_TO_UPLOAD: '💡 Use "uipath publish" to upload to UiPath Orchestrator',
    CREDENTIALS_SAVED: 'Credentials have been saved to .env file',
    CREDENTIALS_REMOVED: 'Credentials have been removed',

    // Directory/File operations
    CREATED_OUTPUT_DIRECTORY: 'Created output directory:',
    CONFIG_FILE_NOT_FOUND_WARNING: `⚠️ ${AUTH_CONSTANTS.FILES.SDK_CONFIG} not found in project root.`,
    SCOPE_NOT_PROVIDED_USING_CLIENT_SCOPES: 'ℹ️ Scope not provided. By default, all scopes registered with this clientId will be used.',
    
    // Next steps instructions
    NEXT_STEPS: 'Next steps:',
    STEP_BUILD_APP: '1. Build your application: npm run build',
    STEP_PACKAGE_APP: '2. Package your application: uipath pack ./dist',
    STEP_PACKAGE_NOTE: '   (App name and version will be automatically used from registration)',
    STEP_PUBLISH_PACKAGE: '3. Publish the package: uipath publish',
    
    // Headers
    APP_DEPLOYMENT: '🚀 UiPath App Deployment',
    PACKAGE_CREATOR: '📦 UiPath NuGet Package Creator',
    PUBLISHER: '🚀 UiPath Publisher',
    PACKAGE_PREVIEW: '🔍 Package Preview',
    ACCESS_TOKEN_HEADER: 'Access Token:',
    
    // Success messages
    PACKAGE_READY: '🎉 Package is ready for publishing!',
    PACKAGE_AVAILABLE: '🎉 Package is now available in UiPath Orchestrator',
    APP_DEPLOYED: '🎉 Your app is now live!',
  },
  
  PROMPTS: {
    ENTER_APP_NAME: 'Enter app name:',
    ENTER_PACKAGE_NAME: 'Enter package name:',
    ENTER_PACKAGE_DESCRIPTION: 'Enter package description:',
    SELECT_PACKAGE_TO_PUBLISH: 'Select package to publish:',
    REAUTH_QUESTION: 'Do you want to re-authenticate?',
    COMPLETE_AUTH_IN_BROWSER: 'Please complete the authentication in your browser',
    BROWSER_FALLBACK_INSTRUCTION: 'If the browser didn\'t open automatically, visit:',
    REUSE_CLIENT_ID: 'Do you want UiPath to create a new OAuth client during deployment or reuse existing from uipath.json? (Y = create new, N = reuse existing clientId)',
    ENTER_SCOPES: 'Enter the required scopes for your app (e.g., OR.Execution OR.Folders), please refer https://uipath.github.io/uipath-typescript/oauth-scopes/ for details',
  },
  
  HELP: {
    // CLI help messages
    FLAG_HELP: 'Run --help to see available options',
    COMMAND_HELP: 'Run --help to see available commands',
  },
  
  VALIDATIONS: {
    APP_NAME_REQUIRED: 'App name is required',
    APP_NAME_INVALID_CHARS: 'App name can only contain letters, numbers, underscores (_), and hyphens (-). Please remove invalid special characters and try again.',
    PACKAGE_NAME_REQUIRED: 'Package name is required',
    MISSING_REQUIRED_CONFIG: '❌ Missing required configuration:',
    PROVIDE_VIA_ENV_OR_FLAGS: '💡 Provide these via environment variables or CLI flags:',
    ENV_VARIABLES_HEADER: 'Environment variables (.env file):',
    ARGUMENTS_HEADER: 'Arguments',
  },

  // Error context strings for handleHttpError
  ERROR_CONTEXT: {
    PACKAGE_PUBLISHING: 'package publishing',
    CLIENT_CREDENTIALS_AUTH: 'client credentials authentication',
    APP_DEPLOYMENT: 'app deployment',
    APP_UPGRADE: 'app upgrade',
    CODED_APP_REGISTRATION: 'coded app registration',
  },
} as const;

/**
 * Helper function to get HTTP status-specific error messages with context
 */
export const getHttpErrorMessage = (status: number, context?: string): string => {
  switch (status) {
    case 401:
      return MESSAGES.ERRORS.AUTHENTICATION_FAILED;
    case 403:
      return context 
        ? `Access denied. You may not have permission to ${context.toLowerCase()} in this tenant/organization`
        : MESSAGES.ERRORS.ACCESS_DENIED;
    case 404:
      return MESSAGES.ERRORS.API_ENDPOINT_NOT_FOUND;
    case 413:
      return context?.includes('package') 
        ? MESSAGES.ERRORS.PACKAGE_TOO_LARGE 
        : MESSAGES.ERRORS.PAYLOAD_TOO_LARGE;
    case 429:
      return MESSAGES.ERRORS.RATE_LIMIT_EXCEEDED;
    case 500:
      return context 
        ? `Server error occurred${context ? ` during ${context.toLowerCase()}` : ''}. Please try again later or contact UiPath support`
        : MESSAGES.ERRORS.SERVER_ERROR;
    case 502:
    case 503:
    case 504:
      return MESSAGES.ERRORS.SERVICES_UNAVAILABLE;
    default:
      return context 
        ? `HTTP ${status} error occurred during ${context.toLowerCase()}`
        : `HTTP ${status} error occurred`;
  }
};