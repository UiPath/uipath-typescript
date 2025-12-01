import { PaginationOptions } from '../../utils/pagination/types';

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
export interface ChoiceSetValue {
  /** Unique identifier for the choice set value */
  id: string;
  /** Name of the choice set value */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Numeric identifier */
  numberId: number;
  /** Creation timestamp */
  createdTime: string;
  /** Last update timestamp */
  updatedTime: string;
}

/**
 * Options for getting choice set values by choice set ID
 */
export type ChoiceSetGetByIdOptions = {
  /** Level of entity expansion (default: 0) */
  expansionLevel?: number;
} & PaginationOptions;

