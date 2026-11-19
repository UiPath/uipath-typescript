/**
 * Session storage keys used by the auth module
 */
export const AUTH_STORAGE_KEYS = {
  TOKEN_PREFIX: 'uipath_sdk_user_token-',
  OAUTH_CONTEXT: 'uipath_sdk_oauth_context',
  LICENSE_PREFIX: 'uipath_sdk_license-',
} as const;

/** Name prefix of the lock the tabs of an app take turns holding to renew a session they share. */
export const TOKEN_REFRESH_LOCK_PREFIX = 'uipath_sdk_token_refresh-';

/** How long before expiry an OAuth access token is renewed, so a request cannot expire in flight. */
export const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;
