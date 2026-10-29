import { describe, expect, it } from 'vitest';
import { authenticatedUserFromToken } from '@/core/auth/authenticated-user';
import { AuthenticationError } from '@/core/errors';
import {
  TEST_NON_USER_SUBJECT_TYPES,
  TEST_OPAQUE_TOKEN,
  TEST_USER_CLAIMS,
  TEST_USER_ID,
  createTestJwt
} from '@tests/utils/jwt';

describe('authenticatedUserFromToken', () => {
  it('maps the user claims to camelCase fields', () => {
    const user = authenticatedUserFromToken(createTestJwt(TEST_USER_CLAIMS));

    expect(user).toEqual({
      id: TEST_USER_ID,
      name: TEST_USER_CLAIMS.name,
      email: TEST_USER_CLAIMS.email,
      preferredUsername: TEST_USER_CLAIMS.preferred_username,
      firstName: TEST_USER_CLAIMS.first_name,
      lastName: TEST_USER_CLAIMS.last_name,
    });
  });

  it('does not expose the raw snake_case claims', () => {
    const user = authenticatedUserFromToken(createTestJwt(TEST_USER_CLAIMS));

    expect(user).not.toHaveProperty('sub');
    expect(user).not.toHaveProperty('sub_type');
    expect(user).not.toHaveProperty('preferred_username');
    expect(user).not.toHaveProperty('first_name');
    expect(user).not.toHaveProperty('last_name');
  });

  it('leaves profile fields undefined when their claims are missing', () => {
    const token = createTestJwt({ sub: TEST_USER_ID, sub_type: TEST_USER_CLAIMS.sub_type });

    expect(authenticatedUserFromToken(token)).toEqual({ id: TEST_USER_ID });
  });

  it('leaves profile fields undefined when their claims are empty or not strings', () => {
    const token = createTestJwt({ ...TEST_USER_CLAIMS, email: '', name: 42, first_name: null, last_name: ['Doe'] });

    const user = authenticatedUserFromToken(token);

    expect(user.email).toBeUndefined();
    expect(user.name).toBeUndefined();
    expect(user.firstName).toBeUndefined();
    expect(user.lastName).toBeUndefined();
    expect(user.preferredUsername).toBe(TEST_USER_CLAIMS.preferred_username);
  });

  it('throws AuthenticationError for an opaque personal access token', () => {
    expect(() => authenticatedUserFromToken(TEST_OPAQUE_TOKEN)).toThrow(AuthenticationError);
  });

  it('throws AuthenticationError for an empty token', () => {
    expect(() => authenticatedUserFromToken('')).toThrow(AuthenticationError);
  });

  it.each(TEST_NON_USER_SUBJECT_TYPES)(
    'throws AuthenticationError for a token whose sub_type is %s',
    (subType) => {
      const token = createTestJwt({ ...TEST_USER_CLAIMS, sub_type: subType });

      expect(() => authenticatedUserFromToken(token)).toThrow(AuthenticationError);
    }
  );

  it('throws AuthenticationError when the token has no sub_type claim', () => {
    const { sub_type: _subType, ...claims } = TEST_USER_CLAIMS;

    expect(() => authenticatedUserFromToken(createTestJwt(claims))).toThrow(AuthenticationError);
  });

  it('throws AuthenticationError when a user token has no sub claim', () => {
    const { sub: _sub, ...claims } = TEST_USER_CLAIMS;

    expect(() => authenticatedUserFromToken(createTestJwt(claims))).toThrow(AuthenticationError);
  });

  it('throws AuthenticationError when the payload is not JSON', () => {
    const token = `header.${Buffer.from('not-json').toString('base64url')}.signature`;

    expect(() => authenticatedUserFromToken(token)).toThrow(AuthenticationError);
  });
});
