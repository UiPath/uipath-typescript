import type { UiPath } from '@uipath/uipath-typescript/core';

/** The signed-in user, decoded from the OAuth access token. */
export interface CurrentUser {
  /** User GUID (`sub` claim). */
  userId: string;
  /** Organization (partition) GUID (`prt_id` claim). */
  organizationId: string;
  email: string;
  displayName: string;
}

interface TokenClaims {
  sub?: string;
  prt_id?: string;
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
 * Identifies the signed-in user from the SDK's access token. The token's
 * `sub` claim is the Identity user GUID and `prt_id` is the organization
 * (partition) GUID — the two values every platform RBAC call needs.
 */
export function getCurrentUser(sdk: UiPath): CurrentUser {
  const token = sdk.getToken();
  if (!token) throw new Error('Not authenticated');
  const claims = decodeJwtPayload(token);
  if (!claims.sub || !claims.prt_id) {
    throw new Error('Access token is missing sub/prt_id claims');
  }
  const email = claims.email ?? claims.preferred_username ?? '';
  return {
    userId: claims.sub,
    organizationId: claims.prt_id,
    email,
    displayName: claims.name ?? email,
  };
}
