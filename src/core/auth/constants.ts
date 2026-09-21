/**
 * Session storage keys used by the auth module
 */
export const AUTH_STORAGE_KEYS = {
  TOKEN_PREFIX: 'uipath_sdk_user_token-',
  OAUTH_CONTEXT: 'uipath_sdk_oauth_context',
  CODE_VERIFIER: 'uipath_sdk_code_verifier',
} as const;

/**
 * A token is treated as expired this long before its actual expiry, so a
 * request signed just before the deadline cannot be rejected server-side after
 * network latency and client/server clock skew are added.
 */
export const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;
