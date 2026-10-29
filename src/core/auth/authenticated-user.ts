import { AuthenticationError } from '@/core/errors';
import { decodeJwtClaims } from '@/utils/encoding/jwt';
import type { AuthenticatedUser } from './types';

/** `sub_type` Identity issues on a person's token; applications, machines and robots get other values. */
const USER_SUBJECT_TYPE = 'user';

/** Claims Identity puts on a user access token. */
interface UserTokenClaims {
  sub?: unknown;
  sub_type?: unknown;
  name?: unknown;
  email?: unknown;
  preferred_username?: unknown;
  first_name?: unknown;
  last_name?: unknown;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * Reads the signed-in user from an access token's claims. The signature is not
 * verified: this is the token the SDK already sends with its own requests.
 *
 * @param token - The current access token
 * @returns The user the token was issued to
 * @throws AuthenticationError when the token does not identify a user: a personal
 *   access token (opaque), or a token issued to an application, machine or robot
 */
export function authenticatedUserFromToken(token: string): AuthenticatedUser {
  const claims = decodeJwtClaims<UserTokenClaims>(token);
  const id = asNonEmptyString(claims?.sub);

  if (!claims || claims.sub_type !== USER_SUBJECT_TYPE || !id) {
    throw new AuthenticationError({
      message:
        'The access token does not identify a user. getAuthenticatedUser() needs a user sign-in; ' +
        'personal access tokens and tokens issued to applications, machines or robots are not supported.'
    });
  }

  return {
    id,
    name: asNonEmptyString(claims.name),
    email: asNonEmptyString(claims.email),
    preferredUsername: asNonEmptyString(claims.preferred_username),
    firstName: asNonEmptyString(claims.first_name),
    lastName: asNonEmptyString(claims.last_name),
  };
}
