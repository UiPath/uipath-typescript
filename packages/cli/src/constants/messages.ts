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
    REGISTRATION_ERROR_PREFIX: 'Registration error:',
    PACKAGING_ERROR_PREFIX: 'Packaging error:',
    PUBLISHING_ERROR_PREFIX: 'Publishing error:',
    DEPLOYMENT_ERROR_PREFIX: 'Deployment error:',
    
    // Debug messages
    FAILED_TO_LOAD_APP_CONFIG: 'Failed to load app config:',
    
    // Operation-specific
    APP_REGISTRATION_FAILED: '❌ App registration failed',
    PACKAGE_CREATION_FAILED: '❌ Package creation failed',
    PACKAGE_PUBLISHING_FAILED: '❌ Package publishing failed',
    AUTHENTICATION_PROCESS_FAILED: '❌ Authentication failed',
    LOGOUT_FAILED: '❌ Failed to logout',
    FAILED_TO_FETCH_ORG_TENANT: '❌ Failed to fetch organization/tenant information',
    APP_DEPLOYMENT_FAILED: '❌ App deployment failed',
    APP_UPGRADE_FAILED: '❌ App upgrade failed',
    APP_NOT_PUBLISHED: '❌ App has not been published yet. Run "uipath register app" first',
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
    
    // Command-specific
    UNKNOWN_FLAG: '✗ Error: Unknown flag',
    UNKNOWN_COMMAND: '✗ Error: Unknown command',

    // Push command
    PUSH_PROJECT_ID_REQUIRED:
      'Project ID is required. Use: uipath push <project-id> or set UIPATH_PROJECT_ID in the .env file and use uipath push directly',
    PUSH_VALIDATION_FAILED: 'Validation failed',
    /** Shown when --buildDir path does not exist. */
    PUSH_BUILD_DIR_NOT_FOUND: "Build directory not found.",
    /** Shown when --buildDir path exists but is not a directory. */
    PUSH_BUILD_DIR_NOT_DIRECTORY: "Build path is not a directory.",
    /** Steps to fix buildDir / push setup; shown after build dir validation errors. */
    PUSH_BUILD_DIR_STEPS:
      'Steps:\n  1. Build your project (e.g. npm run build or your framework\'s build command).\n  2. Run: uipath push <project-id> --buildDir <your-buildDir>\n  Example: uipath push my-project-id --buildDir dist',
    PUSH_FAILED_PREFIX: 'Push failed: ',
    PUSH_FILE_OPERATION_FAILED_PREFIX: 'Failed: ',
    /** When create returns 409; we skip so push does not fail. */
    PUSH_FILE_ALREADY_EXISTS_SKIP: '[push] Skipped (already exists): ',
    PUSH_DELETE_FILE_PREFIX: 'Could not delete file ',
    PUSH_DELETE_FOLDER_PREFIX: 'Could not delete folder ',
    PUSH_BINDINGS_PARSE_FAILED_PREFIX: 'Failed to parse ',
    PUSH_CONNECTION_NOT_FOUND_PREFIX: 'Connection not found: ',
    PUSH_RESOURCE_NOT_FOUND_PREFIX: 'Resource not found: ',
    PUSH_RESOURCE_PROCESSING_ERROR_PREFIX: 'Error processing resource ',
    PUSH_MOVE_FOLDER_FAILED_PREFIX: 'Move folder failed: ',
    PUSH_CREATE_FOLDER_FAILED_PREFIX: 'Create folder failed: ',
    PUSH_PROJECT_STRUCTURE_REQUIRED: 'Project structure is required before ensuring content root exists.',
    PUSH_SOURCE_FOLDER_CREATE_FAILED: 'Failed to create source folder; project structure may be inconsistent.',
    PUSH_LOCK_NOT_ACQUIRED: 'Could not acquire lock on the project.',
    PUSH_EMAIL_FROM_TOKEN_FAILED_PREFIX: '[push] Could not get email from access token: ',
    /** When local metadata is missing and remote load/download/parse fails; log and fall back to new metadata. */
    PUSH_REMOTE_METADATA_LOAD_FALLBACK_PREFIX: '[push] Could not load remote push_metadata.json: ',
    PUSH_REMOTE_METADATA_LOAD_FALLBACK_SUFFIX: '; using new metadata.',
    PUSH_TEMP_METADATA_REMOVE_FAILED_PREFIX: '[push] Could not remove temp metadata file: ',
    PUSH_METADATA_UPLOAD_FAILED_PREFIX: '[push] Metadata upload to remote failed: ',
    /** When remote webAppManifest.json update fails (download/parse/upload). */
    PUSH_WEB_APP_MANIFEST_UPDATE_FAILED_PREFIX: '[push] Updating web app manifest failed: ',
    PUSH_DOWNLOAD_REMOTE_FILE_FAILED_PREFIX: '[push] Could not download remote file for diff: ',
    /** When local schemaVersion is less than remote; ask user to pull first. */
    PUSH_SCHEMA_VERSION_BEHIND_REMOTE:
      "Your local code version is behind the remote. Please run 'uipath pull' to get the latest changes, then push again.",

    // Pull command
    PULL_PROJECT_ID_REQUIRED:
      'Project ID is required. Use: uipath pull <project-id> or set UIPATH_PROJECT_ID in the .env file and use uipath pull directly',
    PULL_FAILED_PREFIX: 'Pull failed: ',
    PULL_TARGET_DIR_NOT_FOUND: 'Target directory does not exist.',
    PULL_TARGET_DIR_NOT_DIRECTORY: 'Target path is not a directory.',
    PULL_PROJECT_NOT_FOUND: 'Project not found or empty in Studio Web.',
    /** Shown when pull fails project-type validation (unsupported project or invalid manifest). User-facing; no internal manifest details. */
    PULL_PROJECT_NOT_SUPPORTED:
      'The project you are pulling is not supported. Only Studio Web coded app projects can be pulled. Please check that you have the correct project ID.',
    PULL_OVERWRITE_CONFLICTS: 'Pull would overwrite existing local file(s). Use --overwrite to allow overwriting, or move/back up files and try again.',
    /** Shown when user declines the overwrite prompt (says no). Avoids repeating PULL_OVERWRITE_CONFLICTS. */
    PULL_OVERWRITE_DECLINED: 'Overwrite declined. Pull cancelled.',
    PULL_FILE_DOWNLOAD_FAILED_PREFIX: 'Failed to download file: ',
    /** Soft check: target dir (CWD) has no package.json, webAppManifest.json, or .uipath. */
    PULL_TARGET_NOT_PROJECT_ROOT_WARNING:
      'This directory does not look like a project root (no package.json, webAppManifest.json, or .uipath). Pull will create or overwrite files here. Are you in the right directory?',

    // File operations
    FAILED_TO_UPDATE_ENV: 'Failed to update .env file:',
    MANUAL_ENV_INSTRUCTION: 'Please add the following to your .env file manually:',
    FAILED_TO_SAVE_APP_CONFIG: 'Failed to save app configuration:',
    FAILED_TO_PARSE_ACTION_SCHEMA: 'Failed to parse Action Schema:',

    //Action schema validations
    INVALID_PROPERTY_TYPE: 'Invalid type. Must be one of: string, integer, number, boolean, array, object',
    INVALID_PROPERTY_FORMAT: 'Invalid format. Must be one of: uuid, date',
    INVALID_TYPE_FOR_FORMAT: 'Format is only supported for type string',
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
    
    // Registration
    APP_REGISTERED_SUCCESS: '✅ App registered successfully!',
    USING_REGISTERED_APP: '✅ Using registered app',
    
    // Packaging
    PACKAGE_CREATED_SUCCESS: '✅ NuGet package created successfully!',
    PACKAGE_CONFIG_VALIDATED: '✅ Package configuration validated',
    
    // Publishing
    PACKAGE_PUBLISHED_SUCCESS: '✅ Package published successfully!',

    // Deployment
    APP_DEPLOYED_SUCCESS: '✅ App deployed successfully!',
    APP_UPGRADED_SUCCESS: '✅ App upgraded successfully!',

    // Push
    PUSH_COMPLETED: 'Push completed successfully.',

    // Pull
    PULL_COMPLETED: 'Pull completed successfully.',
  },

  INFO: {
    // Spinners/Progress
    REGISTERING_APP: 'Registering app with UiPath...',
    DEPLOYING_APP: 'Deploying app...',
    UPGRADING_APP: 'Upgrading app to latest version...',
    CHECKING_DEPLOYMENT_STATUS: 'Checking deployment status...',
    CREATING_PACKAGE: 'Creating NuGet package...',
    CREATING_METADATA_FILES: 'Creating metadata files...',
    CREATING_NUPKG_PACKAGE: 'Creating .nupkg package...',
    PUBLISHING_PACKAGE: 'Publishing package to UiPath Orchestrator...',
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
    USE_REGISTERED_VALUES: '💡 Use the registered values by running: uipath pack ./dist',
    RUN_WITHOUT_DRY_RUN: '💡 Run without --dry-run to create the package',
    USE_PUBLISH_TO_UPLOAD: '💡 Use "uipath publish" to upload to UiPath Orchestrator',
    APP_URL_SAVED_TO_ENV: '💡 The app URL has been saved to your .env file as UIPATH_APP_URL and UIPATH_APP_REDIRECT_URI',
    NO_APP_URL_FOR_ACTION_APP: '💡 Action apps do not have an App URL. Action apps will render only inside Action Center',
    APP_CONFIG_SAVED: '💡 App configuration has been saved and will be used by pack command',
    URL_FOR_OAUTH_CONFIG: '💡 You can use this URL as the redirect URI for OAuth configuration in your SDK',
    CREDENTIALS_SAVED: 'Credentials have been saved to .env file',
    CREDENTIALS_REMOVED: 'Credentials have been removed',
    CREATE_ACTION_SCHEMA_FIRST: '💡 Please create an action-schema.json file in the current directory before registering an Action app',
    
    // Directory/File operations
    CREATED_OUTPUT_DIRECTORY: 'Created output directory:',
    
    // Next steps instructions
    NEXT_STEPS: 'Next steps:',
    STEP_BUILD_APP: '1. Build your application: npm run build',
    STEP_PACKAGE_APP: '2. Package your application: uipath pack ./dist',
    STEP_PACKAGE_NOTE: '   (App name and version will be automatically used from registration)',
    STEP_PUBLISH_PACKAGE: '3. Publish the package: uipath publish',
    
    // Headers
    PUSH_HEADER: '🚀 UiPath Push',
    PULL_HEADER: '⬇️ UiPath Pull',
    /** Progress line during file download (e.g. "Pulling files... 3/10 completed"). */
    PULL_PROGRESS: 'Pulling files...',
    /** When remote push_metadata.json cannot be read; we pull all files under source/. */
    PULL_METADATA_READ_FALLBACK: '[pull] Could not read remote push_metadata.json',
    PUSH_RESOURCE_ADDED_PREFIX: '[resources] Added: ',
    PUSH_RESOURCE_UNCHANGED_PREFIX: '[resources] Unchanged: ',
    PUSH_RESOURCE_UPDATED_PREFIX: '[resources] Updated: ',
    APP_REGISTRATION: '🚀 UiPath App Registration',
    APP_DEPLOYMENT: '🚀 UiPath App Deployment',
    PACKAGE_CREATOR: '📦 UiPath NuGet Package Creator',
    PUBLISHER: '🚀 UiPath Publisher',
    PACKAGE_PREVIEW: '🔍 Package Preview',
    ACCESS_TOKEN_HEADER: 'Access Token:',
    
    // Success messages
    PACKAGE_READY: '🎉 Package is ready for publishing!',
    APP_REGISTERED: '🎉 Your app has been registered with UiPath!',
    PACKAGE_AVAILABLE: '🎉 Package is now available in UiPath Orchestrator',
    APP_DEPLOYED: '🎉 Your app is now live!',
  },
  
  PROMPTS: {
    PULL_OVERWRITE_CONFIRM: 'This pull will overwrite one or more local files. Do you want to continue? (Y/n)',
    PULL_CONTINUE_NOT_PROJECT_ROOT: 'Continue anyway? (y/N)',
    ENTER_APP_NAME: 'Enter app name:',
    ENTER_PACKAGE_NAME: 'Enter package name:',
    ENTER_PACKAGE_DESCRIPTION: 'Enter package description:',
    SELECT_PACKAGE_TO_PUBLISH: 'Select package to publish:',
    REAUTH_QUESTION: 'Do you want to re-authenticate?',
    CONTINUE_WITH_DIFFERENT_VALUES: 'Do you want to continue with these different values?',
    COMPLETE_AUTH_IN_BROWSER: 'Please complete the authentication in your browser',
    BROWSER_FALLBACK_INSTRUCTION: 'If the browser didn\'t open automatically, visit:',
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
    APP_REGISTRATION: 'app registration',
    PACKAGE_PUBLISHING: 'package publishing',
    CLIENT_CREDENTIALS_AUTH: 'client credentials authentication',
    APP_DEPLOYMENT: 'app deployment',
    APP_UPGRADE: 'app upgrade',
    PUSH_ACQUIRE_LOCK: 'acquire lock',
    PUSH_RELEASE_LOCK: 'release lock',
    PUSH_PULL_OPERATION: 'push/pull operation',
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