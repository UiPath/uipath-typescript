import { AuthenticationError, ValidationError } from '@/core/errors';
import { decodeJwtClaims } from '@/utils/encoding/jwt';
import type { AuthenticatedUser } from './types';

/** `sub_type` Identity issues on a person's token; applications, machines and robots get other values. */
const USER_SUBJECT_TYPE = 'user';

/** Claims Identity puts on a user access token. */
interface UserTokenClaims {
  sub?: unknown;
  sub_type?: unknown;
  exp?: unknown;
  name?: unknown;
  email?: unknown;
  preferred_username?: unknown;
  first_name?: unknown;
  last_name?: unknown;
}

type ProfileField = Exclude<keyof AuthenticatedUser, 'id'>;

/** The claim each profile field is read from. */
const PROFILE_CLAIMS: Record<ProfileField, keyof UserTokenClaims> = {
  name: 'name',
  email: 'email',
  preferredUsername: 'preferred_username',
  firstName: 'first_name',
  lastName: 'last_name',
};

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * Reads the signed-in user from an access token's claims. The signature is not
 * verified: this is the token the SDK already sends with its own requests.
 * Profile fields with no value are left off the result.
 *
 * @param token - The current access token
 * @returns The user the token was issued to
 * @throws ValidationError when the token does not identify a user: a personal
 *   access token (opaque), or a token issued to an application, machine or robot
 * @throws AuthenticationError when the token has expired
 */
export function authenticatedUserFromToken(token: string): AuthenticatedUser {
  const claims = decodeJwtClaims<UserTokenClaims>(token);
  const id = asNonEmptyString(claims?.sub);

  if (!claims || claims.sub_type !== USER_SUBJECT_TYPE || !id) {
    throw new ValidationError({
      message:
        'The access token does not identify a user. getAuthenticatedUser() needs a user sign-in; ' +
        'personal access tokens and tokens issued to applications, machines or robots are not supported.'
    });
  }

  // A token passed as `secret` is never refreshed, so it can outlive its expiry.
  if (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now()) {
    throw new AuthenticationError({ message: 'The access token has expired.' });
  }

  const user: AuthenticatedUser = { id };
  for (const field of Object.keys(PROFILE_CLAIMS) as ProfileField[]) {
    const value = asNonEmptyString(claims[PROFILE_CLAIMS[field]]);
    if (value !== undefined) {
      user[field] = value;
    }
  }
  return user;
}
