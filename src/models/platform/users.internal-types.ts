/**
 * Internal Platform user types — raw API wire shapes before transformation.
 */

/**
 * A user exactly as the API returns it: `*Time` fields under their wire names,
 * `groupIDs` casing, numeric `type`/`category` codes, and internal fields
 * (`legacyId`, `bypassBasicAuthRestriction`) the SDK drops.
 */
export interface RawPlatformUser {
  id: string;
  userName: string;
  email: string;
  emailConfirmed: boolean;
  name: string | null;
  surname: string | null;
  displayName: string | null;
  creationTime: string;
  lastModificationTime: string | null;
  lastLoginTime: string | null;
  groupIDs: string[] | null;
  legacyId: number;
  isActive: boolean;
  bypassBasicAuthRestriction: boolean;
  type: number;
  category: number;
  invitationAccepted: boolean;
}

/**
 * Wire shape of the user list response.
 */
export interface RawPlatformUserListResponse {
  totalCount: number;
  results: RawPlatformUser[];
}

/**
 * A failure entry exactly as the API returns it. Defined independently of the
 * public error type — the wire format is a separate concern.
 */
export interface RawPlatformUserUpdateError {
  code: string;
  description: string;
}

/**
 * Wire shape of the user update result. `errors` is nullable in the API spec.
 */
export interface RawPlatformUserUpdateResult {
  succeeded: boolean;
  errors: RawPlatformUserUpdateError[] | null;
}
