import type { PaginationOptions } from '@/utils/pagination/types';

/**
 * Semantic kind of an ontology artifact, independent of its media type.
 */
export enum OntologyArtifactType {
  /** Web Ontology Language (OWL) schema defining the ontology's classes and properties; one per ontology. */
  Schema = 'schema',
  /** Shapes Constraint Language (SHACL) shapes constraining the ontology's data; an ontology can have many. */
  Constraints = 'constraints',
  /**
   * Mapping that binds the schema to its data sources; one per ontology. Written in YARRRML (a YAML
   * syntax for mapping rules) or R2RML (the W3C language that maps relational databases to the
   * Resource Description Framework).
   */
  Mapping = 'mapping',
  /** Business rules over the ontology's data; an ontology can have many. */
  BusinessRules = 'business-rules',
  /** Summary document for people and agents; one per ontology. */
  Summary = 'summary',
  /** Context document for agents; one per ontology. */
  Context = 'context',
}

/**
 * Severity of a single artifact validation violation.
 */
export enum OntologyValidationSeverity {
  /** The artifact is invalid; `valid` is `false`. */
  Error = 'ERROR',
  /** The artifact is valid but has a non-blocking issue. */
  Warning = 'WARNING',
}

/**
 * Lifecycle state of an ontology, driven by its artifacts.
 */
export enum OntologyState {
  /** No valid mapping has been uploaded yet. */
  Draft = 'DRAFT',
  /** A valid mapping is in place and the ontology can be queried. */
  Deployed = 'DEPLOYED',
  /** A required artifact was removed after deployment. */
  Broken = 'BROKEN',
}

/**
 * Folder scoping for ontology reads. Provide `folderKey` or `folderPath`; when both are
 * given, `folderKey` wins.
 */
export interface OntologyFolderScopedOptions {
  /** Key (GUID) of the folder. */
  folderKey?: string;
  /** Slash-delimited folder path, e.g. `'Shared/Finance'`, matched without case. */
  folderPath?: string;
}

/**
 * Options for listing ontologies.
 */
export type OntologyGetAllOptions = PaginationOptions & OntologyFolderScopedOptions & {
  /** Text matched case-insensitively against the ontology's ID, name, display name or description. */
  search?: string;
  /** Only return ontologies in this lifecycle state; omit for every state. */
  state?: OntologyState;
};

/**
 * Options for reading a single ontology.
 */
export interface OntologyGetByIdOptions extends OntologyFolderScopedOptions {}

/**
 * Options for reading a single ontology by name.
 */
export interface OntologyGetByNameOptions extends OntologyFolderScopedOptions {}

/**
 * Options for validating artifact content.
 */
export interface OntologyValidateArtifactContentOptions {
  /** Semantic type; required when not inferrable from the media type. */
  type?: OntologyArtifactType;
}

/**
 * An ontology as returned by the SDK.
 */
export interface OntologyGetResponse {
  /** Ontology ID (GUID). */
  id: string;
  /** User-supplied name, unique within its folder. */
  name: string;
  /** Name shown in the UI. */
  displayName: string;
  /** Free-text description. */
  description?: string;
  /** Key (GUID) of the folder the ontology belongs to. */
  folderKey?: string;
  /** Lifecycle state. */
  state: OntologyState;
  /** User who created the ontology. */
  createdBy?: string;
  /** Creation timestamp (ISO 8601). */
  createdTime?: string;
  /** User who last updated the ontology. */
  updatedBy?: string;
  /** Last update timestamp (ISO 8601). */
  updatedTime?: string;
}

/**
 * A single problem found while validating artifact content.
 */
export interface OntologyValidationViolation {
  /** Whether the violation makes the artifact invalid. */
  severity: OntologyValidationSeverity;
  /** Description of the problem. */
  message: string;
}

/**
 * Outcome of validating artifact content.
 */
export interface OntologyValidateArtifactContentResponse {
  /** `false` when any violation has `Error` severity. */
  valid: boolean;
  /** Artifact type the content was validated as. */
  type: OntologyArtifactType;
  /** Problems found; empty when the content is clean. */
  violations: OntologyValidationViolation[];
}
