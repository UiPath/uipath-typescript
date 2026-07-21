/**
 * Internal-only types for the Identity Users service.
 *
 * NOT exported from the public barrel (`src/models/identity/index.ts`).
 */

/**
 * Raw user shape as returned by the Identity user management API.
 *
 * Mirrors the API contract exactly: it uses the API's field names
 * (`creationTime`, `groupIDs`, …) and numeric `type`/`category` codes — the
 * Swagger spec declares string enums for these, but the live API returns
 * numbers. The SDK renames/maps them before returning to consumers.
 */
export interface RawUserEntry {
  id: string;
  userName: string;
  email: string;
  emailConfirmed: boolean;
  name: string | null;
  surname: string | null;
  displayName: string | null;
  /** Renamed to `createdTime` in the SDK response. */
  creationTime: string;
  /** Renamed to `lastModifiedTime` in the SDK response. */
  lastModificationTime: string | null;
  lastLoginTime: string | null;
  /** Renamed to `groupIds` in the SDK response. */
  groupIDs: string[];
  isActive: boolean;
  bypassBasicAuthRestriction: boolean;
  /** Numeric code mapped to the {@link UserType} enum in the SDK response. */
  type: number;
  /** Numeric code mapped to the {@link UserCategory} enum in the SDK response. */
  category: number;
  invitationAccepted: boolean;
  // Internal field the SDK strips before returning to consumers:
  /** Internal platform synchronization id — dropped from the SDK response. */
  legacyId?: number;
}

/**
 * Fields stripped from each {@link RawUserEntry} before it is returned to the
 * SDK consumer.
 */
export const INTERNAL_USER_FIELDS = [
  'legacyId',
] as const satisfies ReadonlyArray<keyof RawUserEntry>;
