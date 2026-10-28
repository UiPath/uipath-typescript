import type { UiPath } from '@uipath/uipath-typescript/core';

/** The signed-in user, decoded from the OAuth access token. */
export interface CurrentUser {
  /** User GUID (`sub` claim). */
  userId: string;
  email: string;
  displayName: string;
}

interface TokenClaims {
  sub?: string;
  email?: string;
  name?: string;
  preferred_username?: string;
}

function decodeJwtPayload(token: string): TokenClaims {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('Malformed access token');
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(json) as TokenClaims;
}

/**
 * Identifies the signed-in user from the SDK's access token, with no API call:
 * the `sub` claim is the Identity user GUID every platform lookup keys on.
 */
export function getCurrentUser(sdk: UiPath): CurrentUser {
  const token = sdk.getToken();
  if (!token) throw new Error('Not authenticated');
  const claims = decodeJwtPayload(token);
  if (!claims.sub) throw new Error('Access token is missing the sub claim');
  const email = claims.email ?? claims.preferred_username ?? '';
  return { userId: claims.sub, email, displayName: claims.name ?? email };
}
