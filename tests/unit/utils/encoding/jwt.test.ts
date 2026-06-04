import { describe, expect, it } from 'vitest';
import { extractUserIdFromToken } from '../../../../src/utils/encoding/jwt';

const TEST_USER_ID = 'user-guid-1234';

/** Encodes a claims object as an unpadded base64url JWT segment. */
function encodeJwtSegment(value: Record<string, unknown>): string {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Builds an unsigned JWT whose payload carries the given claims. */
function createTestJwt(claims: Record<string, unknown>): string {
  return `${encodeJwtSegment({ alg: 'none', typ: 'JWT' })}.${encodeJwtSegment(claims)}.signature`;
}

describe('extractUserIdFromToken', () => {
  it('extracts the sub claim from a valid JWT', () => {
    const token = createTestJwt({ sub: TEST_USER_ID, client_id: 'client-1' });

    expect(extractUserIdFromToken(token)).toBe(TEST_USER_ID);
  });

  it('extracts the user id from a base64url payload containing - and _ characters', () => {
    // `???>>>` encodes to base64 containing `/` and `+`, which become `_`
    // and `-` in the JWT's base64url payload — exercising the
    // base64url-to-base64 conversion and unpadded-length handling.
    const token = createTestJwt({ sub: TEST_USER_ID, name: '???>>>', padding: 'x' });

    expect(extractUserIdFromToken(token)).toBe(TEST_USER_ID);
  });

  it('returns undefined for an opaque (non-JWT) token', () => {
    expect(extractUserIdFromToken('rt_opaque-personal-access-token')).toBeUndefined();
  });

  it('returns undefined for an empty token', () => {
    expect(extractUserIdFromToken('')).toBeUndefined();
  });

  it('returns undefined when the payload has no sub claim', () => {
    const token = createTestJwt({ client_id: 'client-1' });

    expect(extractUserIdFromToken(token)).toBeUndefined();
  });

  it('returns undefined when the sub claim is not a string', () => {
    const token = createTestJwt({ sub: 12345 });

    expect(extractUserIdFromToken(token)).toBeUndefined();
  });

  it('returns undefined when the payload is not valid JSON', () => {
    expect(extractUserIdFromToken('header.%%%invalid%%%.signature')).toBeUndefined();
  });
});
