/**
 * JWT decoding helpers — payload inspection only, no signature verification.
 */
import { decodeBase64 } from './base64';

const BASE64URL_DASH_RE = /-/g;
const BASE64URL_UNDERSCORE_RE = /_/g;

/**
 * Converts a base64url-encoded JWT segment to standard base64 with padding.
 */
function base64UrlToBase64(value: string): string {
  const base64 = value
    .replace(BASE64URL_DASH_RE, '+')
    .replace(BASE64URL_UNDERSCORE_RE, '/');
  return base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
}

/**
 * Extracts the user id (`sub` claim) from a JWT access token payload.
 * Returns an empty string for opaque (non-JWT) tokens or malformed payloads.
 *
 * @param token - The access token to inspect
 * @returns The user id, or an empty string if it cannot be extracted
 */
export function extractUserIdFromToken(token: string): string {
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return '';
    }

    const claims = JSON.parse(decodeBase64(base64UrlToBase64(payload))) as Record<string, unknown>;
    const sub = claims['sub'];
    return typeof sub === 'string' && sub ? sub : '';
  } catch {
    return '';
  }
}
