import type { UiPath } from '@uipath/uipath-typescript/core'

/** The signed-in user, as identified by the SDK's OAuth access token. */
export interface CurrentUser {
  /** GUID of the user — the token's `sub` claim. */
  userId: string
  /** GUID of the organization the token was issued for — the token's `prt_id` claim. */
  organizationId: string
}

interface AccessTokenClaims {
  sub?: unknown
  prt_id?: unknown
}

/**
 * Identifies the signed-in user from the SDK's access token.
 *
 * The access token is a JWT whose payload carries `sub` (user GUID) and
 * `prt_id` (organization GUID). Only the payload is read; the signature is
 * not verified here, and does not need to be: these values only decide *which*
 * user to ask the Directory API about, and that request is sent with the same
 * token, so the server enforces the truth.
 */
export function getCurrentUser(sdk: UiPath): CurrentUser {
  const token = sdk.getToken()
  if (!token) {
    throw new Error('Not signed in — no access token available.')
  }

  const claims = decodeJwtPayload<AccessTokenClaims>(token)
  const userId = asNonEmptyString(claims.sub)
  const organizationId = asNonEmptyString(claims.prt_id)
  if (!userId || !organizationId) {
    throw new Error('Access token is missing the `sub` or `prt_id` claim.')
  }

  return { userId, organizationId }
}

function decodeJwtPayload<T>(token: string): T {
  const parts = token.split('.')
  if (parts.length < 2) {
    throw new Error('Access token is not a JWT.')
  }

  // JWTs use base64url without padding; atob needs standard base64.
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  // atob yields a binary string — decode it as UTF-8 so non-ASCII claim values survive.
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as T
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}
