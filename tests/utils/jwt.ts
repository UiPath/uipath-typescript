/**
 * Shared JWT test helpers — build unsigned JWTs for tests that exercise
 * token-payload decoding.
 */

export const TEST_USER_ID = 'user-guid-1234';

/** A personal access token: opaque, so it has no claims to decode. */
export const TEST_OPAQUE_TOKEN = 'rt_opaque-personal-access-token';

/** Claims Identity issues on a user's access token (wire names). */
export const TEST_USER_CLAIMS = {
  sub: TEST_USER_ID,
  sub_type: 'user',
  name: 'Jo Doe',
  email: 'jo.doe@example.com',
  preferred_username: 'jo.doe',
  first_name: 'Jo',
  last_name: 'Doe',
} as const;

/** `sub_type` values Identity issues on application, machine and robot tokens. */
export const TEST_NON_USER_SUBJECT_TYPES = ['service.external', 'service.internal', 'machine', 'robot.user'];

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
