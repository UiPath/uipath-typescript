/**
 * Internal Platform directory types — raw API wire shapes before transformation.
 */

/**
 * A search result exactly as the API returns it: `identifier`/`identityName`
 * naming, numeric `type` codes, and the redundant `objectType` discriminator
 * the SDK drops.
 */
export interface RawPlatformDirectoryEntry {
  source: string;
  identifier: string;
  identityName: string;
  displayName: string;
  email: string | null;
  domain: string | null;
  type: number;
  objectType: string;
}

/**
 * A membership-check result exactly as the API returns it. All entries are
 * groups; `objectType` is dropped as redundant.
 */
export interface RawPlatformDirectoryGroup {
  objectType: string;
  externalId: string | null;
  source: string;
  identifier: string;
  name: string;
  email: string | null;
  displayName: string;
}
