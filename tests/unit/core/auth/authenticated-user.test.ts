import { describe, expect, it } from 'vitest';
import { authenticatedUserFromToken } from '@/core/auth/authenticated-user';
import { AuthenticationError, ValidationError } from '@/core/errors';
import {
  TEST_NON_USER_SUBJECT_TYPES,
  TEST_OPAQUE_TOKEN,
  TEST_UNICODE_NAME,
  TEST_USER_CLAIMS,
  TEST_USER_ID,
  createTestJwt
} from '@tests/utils/jwt';

const nowInSeconds = () => Math.floor(Date.now() / 1000);

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

  it('decodes non-ASCII claim values as UTF-8', () => {
    const token = createTestJwt({ ...TEST_USER_CLAIMS, name: TEST_UNICODE_NAME });

    expect(authenticatedUserFromToken(token).name).toBe(TEST_UNICODE_NAME);
  });

  it('leaves off profile fields whose claims are missing', () => {
    const token = createTestJwt({ sub: TEST_USER_ID, sub_type: TEST_USER_CLAIMS.sub_type });

    const user = authenticatedUserFromToken(token);

    expect(user).toEqual({ id: TEST_USER_ID });
    expect(Object.keys(user)).toEqual(['id']);
  });

  it('leaves off profile fields whose claims are empty or not strings', () => {
    const token = createTestJwt({ ...TEST_USER_CLAIMS, email: '', name: 42, first_name: null, last_name: ['Doe'] });

    const user = authenticatedUserFromToken(token);

    expect(user).not.toHaveProperty('email');
    expect(user).not.toHaveProperty('name');
    expect(user).not.toHaveProperty('firstName');
    expect(user).not.toHaveProperty('lastName');
    expect(user.preferredUsername).toBe(TEST_USER_CLAIMS.preferred_username);
  });

  it('accepts a token that has not expired', () => {
    const token = createTestJwt({ ...TEST_USER_CLAIMS, exp: nowInSeconds() + 3600 });

    expect(authenticatedUserFromToken(token).id).toBe(TEST_USER_ID);
  });

  it('throws AuthenticationError for an expired token', () => {
    const token = createTestJwt({ ...TEST_USER_CLAIMS, exp: nowInSeconds() - 60 });

    expect(() => authenticatedUserFromToken(token)).toThrow(AuthenticationError);
  });

  it('throws ValidationError for an opaque personal access token', () => {
    expect(() => authenticatedUserFromToken(TEST_OPAQUE_TOKEN)).toThrow(ValidationError);
  });

  it('throws ValidationError for an empty token', () => {
    expect(() => authenticatedUserFromToken('')).toThrow(ValidationError);
  });

  it.each(TEST_NON_USER_SUBJECT_TYPES)(
    'throws ValidationError for a token whose sub_type is %s',
    (subType) => {
      const token = createTestJwt({ ...TEST_USER_CLAIMS, sub_type: subType });

      expect(() => authenticatedUserFromToken(token)).toThrow(ValidationError);
    }
  );

  it('throws ValidationError rather than AuthenticationError for an expired non-user token', () => {
    const token = createTestJwt({ ...TEST_USER_CLAIMS, sub_type: TEST_NON_USER_SUBJECT_TYPES[0], exp: nowInSeconds() - 60 });

    expect(() => authenticatedUserFromToken(token)).toThrow(ValidationError);
  });

  it('throws ValidationError when the token has no sub_type claim', () => {
    const { sub_type: _subType, ...claims } = TEST_USER_CLAIMS;

    expect(() => authenticatedUserFromToken(createTestJwt(claims))).toThrow(ValidationError);
  });

  it('throws ValidationError when a user token has no sub claim', () => {
    const { sub: _sub, ...claims } = TEST_USER_CLAIMS;

    expect(() => authenticatedUserFromToken(createTestJwt(claims))).toThrow(ValidationError);
  });

  it('throws ValidationError when the payload is not JSON', () => {
    const token = `header.${Buffer.from('not-json').toString('base64url')}.signature`;

    expect(() => authenticatedUserFromToken(token)).toThrow(ValidationError);
  });
});
