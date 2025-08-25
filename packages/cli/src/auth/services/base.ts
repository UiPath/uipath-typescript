import { AUTH_CONSTANTS } from '../../constants/auth.js';

export interface HeaderOptions {
  contentType?: string;
  bearerToken?: string;
  additionalHeaders?: Record<string, string>;
}

/**
 * Creates headers for HTTP requests with flexible options
 * @param options - Options for creating headers
 * @returns Headers object
 */
export function createHeaders(options: HeaderOptions = {}): Record<string, string> {
  const {
    contentType = AUTH_CONSTANTS.CONTENT_TYPES.JSON,
    bearerToken,
    additionalHeaders = {}
  } = options;

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    ...additionalHeaders
  };

  if (bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`;
  }

  return headers;
}

/**
 * Creates headers for authenticated API requests
 * @param accessToken - The bearer token for authentication
 * @param additionalHeaders - Any additional headers to include
 * @returns Headers object with Authorization and Content-Type
 */
export function createAuthHeaders(accessToken: string, additionalHeaders?: Record<string, string>): Record<string, string> {
  return createHeaders({
    bearerToken: accessToken,
    additionalHeaders
  });
}