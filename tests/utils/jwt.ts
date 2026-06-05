/**
 * Shared JWT test helpers — build unsigned JWTs for tests that exercise
 * token-payload decoding.
 */

export const TEST_USER_ID = 'user-guid-1234';

const BASE64_PLUS_RE = /\+/g;
const BASE64_SLASH_RE = /\//g;
const BASE64_PADDING_RE = /=+$/;

/** Encodes a claims object as an unpadded base64url JWT segment. */
export function encodeJwtSegment(value: Record<string, unknown>): string {
  return btoa(JSON.stringify(value))
    .replace(BASE64_PLUS_RE, '-')
    .replace(BASE64_SLASH_RE, '_')
    .replace(BASE64_PADDING_RE, '');
}

/** Builds an unsigned JWT whose payload carries the given claims. */
export function createTestJwt(claims: Record<string, unknown>): string {
  return `${encodeJwtSegment({ alg: 'none', typ: 'JWT' })}.${encodeJwtSegment(claims)}.signature`;
}
