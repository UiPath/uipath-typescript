/**
 * Internal Platform group types — raw API wire shapes before transformation.
 */

/**
 * A group exactly as the API returns it: `*Time` fields under their wire names,
 * numeric `type` codes, and fields the SDK drops (`members` is present but always
 * empty — membership is served by the Members endpoint; `mappedRole`/`scope` are
 * undocumented internals).
 */
export interface RawPlatformGroup {
  id: string;
  name: string;
  displayName: string;
  type: number;
  creationTime: string;
  lastModificationTime: string | null;
  members: unknown[];
  mappedRole: unknown;
  scope: unknown;
}

/**
 * A group member exactly as the API returns it — numeric `type` code.
 */
export interface RawPlatformGroupMember {
  id: string;
  type: number;
}

/**
 * Wire shape of the paged group members response.
 */
export interface RawPlatformGroupMembersResponse {
  totalCount: number;
  results: RawPlatformGroupMember[];
}
