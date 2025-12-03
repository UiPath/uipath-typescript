/**
 * ChoiceSet Get All Response
 */
export interface ChoiceSetGetAllResponse {
  /** Name identifier of the choice set */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Entity type identifier (1 for ChoiceSet) */
  entityTypeId: number;
  /** Entity type name */
  entityType: string;
  /** Description of the choice set */
  description: string;
  /** Folder ID containing the choice set */
  folderId: string;
  /** Number of records in the choice set */
  recordCount: number;
  /** Total storage size in MB */
  storageSizeInMB: number;
  /** Used storage size in MB */
  usedStorageSizeInMB: number;
  /** Whether RBAC (Role-Based Access Control) is enabled */
  isRbacEnabled: boolean;
  /** List of invalid identifiers */
  invalidIdentifiers: string[];
  /** Whether the model is reserved */
  isModelReserved: boolean;
  /** Unique identifier for the choice set */
  id: string;
  /** User ID who created the choice set */
  createdBy: string;
  /** Creation timestamp */
  createdTime: string;
  /** Last update timestamp */
  updatedTime: string;
  /** User ID who last updated the choice set */
  updatedBy: string;
}

