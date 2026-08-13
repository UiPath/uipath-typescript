/**
 * Business App field mappings.
 */

/**
 * Semantic renames applied to business app rows.
 *
 * The API suffixes its timestamps with `Utc`; the SDK names every timestamp `*Time`, and
 * pairs the "last modified" fields so they read together.
 */
export const BusinessAppMap = {
  createdTimeUtc: 'createdTime',
  modifiedTimeUtc: 'lastModifiedTime',
  modifiedBy: 'lastModifiedBy',
} as const;
