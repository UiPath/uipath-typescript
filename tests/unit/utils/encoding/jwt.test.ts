import { describe, expect, it } from 'vitest';
import { extractUserIdFromToken } from '@/utils/encoding';
import { TEST_USER_ID, createTestJwt } from '@tests/utils/jwt';

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

  it('returns an empty string for an opaque (non-JWT) token', () => {
    expect(extractUserIdFromToken('rt_opaque-personal-access-token')).toBe('');
  });

  it('returns an empty string for an empty token', () => {
    expect(extractUserIdFromToken('')).toBe('');
  });

  it('returns an empty string when the payload has no sub claim', () => {
    const token = createTestJwt({ client_id: 'client-1' });

    expect(extractUserIdFromToken(token)).toBe('');
  });

  it('returns an empty string when the sub claim is not a string', () => {
    const token = createTestJwt({ sub: 12345 });

    expect(extractUserIdFromToken(token)).toBe('');
  });

  it('returns an empty string when the payload is not valid JSON', () => {
    expect(extractUserIdFromToken('header.%%%invalid%%%.signature')).toBe('');
  });
});
