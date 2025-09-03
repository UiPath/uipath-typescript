/**
 * Common CLI error and success messages
 */
export const MESSAGES = {
  ERRORS: {
    // File/Directory validation
    INVALID_DIST_DIRECTORY: 'Invalid dist directory',
    PACKAGE_NAME_REQUIRED: 'Package name is required',
    
    // Authentication & Authorization  
    AUTHENTICATION_FAILED: 'Authentication failed. Please check your UIPATH_BEARER_TOKEN or run "uipath auth" to authenticate',
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
    
    // Operation-specific
    APP_REGISTRATION_FAILED: 'App registration failed',
    PACKAGE_CREATION_FAILED: 'Package creation failed', 
    PACKAGE_PUBLISHING_FAILED: 'Package publishing failed',
    AUTHENTICATION_PROCESS_FAILED: 'Authentication failed',
    LOGOUT_FAILED: 'Failed to logout',
    
    // Ports
    ALL_PORTS_IN_USE: 'All registered ports are in use. Please free up one of the ports listed above and try again.',
    
    // Package-specific
    NO_NUPKG_FILES_FOUND: 'No .nupkg files found',
    UIPATH_DIR_NOT_FOUND: '.uipath directory not found',
    PACKAGE_TOO_LARGE: 'Package file is too large for upload',
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
  },
  
  INFO: {
    // Spinners/Progress
    REGISTERING_APP: 'Registering app with UiPath...',
    CREATING_PACKAGE: 'Creating NuGet package...',
    PUBLISHING_PACKAGE: 'Publishing package to UiPath Orchestrator...',
    FINDING_PORT: 'Finding available port...',
    STARTING_AUTH_SERVER: 'Starting local authentication server...',
    OPENING_BROWSER: 'Opening browser for authentication...',
    WAITING_FOR_AUTH: 'Waiting for authentication...',
    FETCHING_ORG_TENANTS: 'Fetching organization and tenants...',
    LOGGING_OUT: 'Logging out...',
    
    // Tips
    RUN_PACK_FIRST: '💡 Run "uipath pack" first to create a package',
    USE_REGISTERED_VALUES: '💡 Use the registered values by running: uipath pack ./dist',
    RUN_WITHOUT_DRY_RUN: '💡 Run without --dry-run to create the package',
    CREDENTIALS_SAVED: 'Credentials have been saved to .env file',
    CREDENTIALS_REMOVED: 'Credentials have been removed',
    
    // Headers
    APP_REGISTRATION: '🚀 UiPath App Registration',
    PACKAGE_CREATOR: '📦 UiPath NuGet Package Creator', 
    PUBLISHER: '🚀 UiPath Publisher',
    PACKAGE_PREVIEW: '🔍 Package Preview',
    
    // Success messages
    PACKAGE_READY: '🎉 Package is ready for publishing!',
    APP_REGISTERED: '🎉 Your app has been registered with UiPath!',
    PACKAGE_AVAILABLE: '🎉 Package is now available in UiPath Orchestrator',
  },
  
  PROMPTS: {
    ENTER_APP_NAME: 'Enter app name:',
    ENTER_PACKAGE_NAME: 'Enter package name:',
    ENTER_PACKAGE_DESCRIPTION: 'Enter package description:',
    SELECT_PACKAGE_TO_PUBLISH: 'Select package to publish:',
    REAUTH_QUESTION: 'Do you want to re-authenticate?',
    CONTINUE_WITH_DIFFERENT_VALUES: 'Do you want to continue with these different values?',
    COMPLETE_AUTH_IN_BROWSER: 'Please complete the authentication in your browser',
  },
  
  VALIDATIONS: {
    APP_NAME_REQUIRED: 'App name is required',
    PACKAGE_NAME_REQUIRED: 'Package name is required',
  }
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