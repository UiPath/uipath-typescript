/**
 * ChoiceSet Get All Response
 * Only exposes essential fields to SDK users
 */
export interface ChoiceSetGetAllResponse {
  /** Name identifier of the choice set */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Description of the choice set */
  description: string;
  /** Number of choice values/options in this choice set */
  recordCount: number;
  /** Folder ID where the choice set is located */
  folderId: string;
  /** User ID who created the choice set */
  createdBy: string;
  /** User ID who last updated the choice set */
  updatedBy: string;
  /** Creation timestamp */
  createdTime: string;
  /** Last update timestamp */
  updatedTime: string;
}

