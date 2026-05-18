import { PaginationOptions } from '../../utils/pagination/types';

/**
 * ChoiceSet Get All Response
 * Only exposes essential fields to SDK users
 */
export interface ChoiceSetGetAllResponse {
  /** UUID of the choice set */
  id: string;
  /** Name identifier of the choice set */
  name: string;
  /** Human-readable display name of the choice set*/
  displayName: string;
  /** Description of the choice set */
  description: string;
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

/**
 * Represents a single choice set value/record
 */
export interface ChoiceSetGetResponse {
  /** Unique identifier for the choice set value */
  id: string;
  /** Name of the choice set value */
  name: string;
  /** Human-readable display name of the choice set value*/
  displayName: string;
  /** Numeric identifier */
  numberId: number;
  /** Creation timestamp */
  createdTime: string;
  /** Last update timestamp */
  updatedTime: string;
  /** User ID who created this value */
  createdBy?: string;
  /** User ID who last updated this value */
  updatedBy?: string;
  /** User ID of the record owner */
  recordOwner?: string;
}

/**
 * Options for getting choice set values by choice set ID
 */
export type ChoiceSetGetByIdOptions = PaginationOptions;

/**
 * Options for creating a new choice set
 */
export interface ChoiceSetCreateOptions {
  /** Human-readable display name shown in the UI (defaults to `name` if omitted) */
  displayName?: string;
  /** Optional choice set description */
  description?: string;
  /** UUID of the folder to place the choice set in (defaults to the tenant-level folder) */
  folderKey?: string;
}

/**
 * Options for updating an existing choice set's metadata
 */
export interface ChoiceSetUpdateOptions {
  /** New display name for the choice set */
  displayName?: string;
  /** New description for the choice set */
  description?: string;
}

/**
 * Optional fields when inserting a single value into a choice set.
 *
 * The required `name` identifier is passed as a positional argument to
 * `insertValueById`.
 */
export interface ChoiceSetValueInsertOptions {
  /** Human-readable display name (defaults to `name` if omitted) */
  displayName?: string;
}

/**
 * Response returned after inserting a choice-set value — the full value object.
 */
export interface ChoiceSetValueInsertResponse extends ChoiceSetGetResponse {}

/**
 * Response returned after updating a choice-set value — the full value object.
 */
export interface ChoiceSetValueUpdateResponse extends ChoiceSetGetResponse {}

