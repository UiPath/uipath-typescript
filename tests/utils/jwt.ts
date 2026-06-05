/**
 * Shared JWT test helpers — build unsigned JWTs for tests that exercise
 * token-payload decoding.
 */

export const TEST_USER_ID = 'user-guid-1234';

/** Encodes a claims object as an unpadded base64url JWT segment. */
export function encodeJwtSegment(value: Record<string, unknown>): string {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Builds an unsigned JWT whose payload carries the given claims. */
export function createTestJwt(claims: Record<string, unknown>): string {
  return `${encodeJwtSegment({ alg: 'none', typ: 'JWT' })}.${encodeJwtSegment(claims)}.signature`;
}
