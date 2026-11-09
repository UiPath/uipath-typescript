import type { OntologyState } from './ontology.types';

/**
 * Ontology as the API returns it, before SDK field renames.
 */
export interface RawOntologyGetResponse {
  /** Ontology ID (GUID). */
  id: string;
  /** User-supplied name, unique within its folder. */
  name: string;
  /** Name shown in the UI. */
  displayName: string;
  /** Free-text description. */
  description?: string;
  /** Key (GUID) of the folder the ontology belongs to. */
  folderId?: string;
  /** Lifecycle state. */
  state?: OntologyState;
  /** User who created the ontology. */
  createdBy?: string;
  /** Creation timestamp (ISO 8601). */
  createTime?: string;
  /** User who last updated the ontology. */
  updatedBy?: string;
  /** Last update timestamp (ISO 8601). */
  updateTime?: string;
}
