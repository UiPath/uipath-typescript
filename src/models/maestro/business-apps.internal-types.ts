/**
 * Internal Business App types — raw API wire shapes before transformation.
 */

/**
 * A business app exactly as the API returns it.
 *
 * The API suffixes its timestamps with `Utc` and names the modifier fields `modified*`;
 * the SDK renames both on the way out. See `BusinessAppMap`.
 */
export interface BusinessAppApiResponse {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  color: string | null;
  processKeys: string[];
  createdBy: string;
  createdTimeUtc: string;
  modifiedBy: string;
  modifiedTimeUtc: string;
}
