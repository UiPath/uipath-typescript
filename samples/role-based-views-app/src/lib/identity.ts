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

/** Decodes the JWT payload as UTF-8, so names outside ASCII survive. */
function decodeJwtPayload(token: string): TokenClaims {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('Malformed access token');
  const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  const json = new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
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
