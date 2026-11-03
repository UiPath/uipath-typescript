import type { PaginationCursor } from '../../utils/pagination/types';

/**
 * Semantic kind of an artifact — independent of mediaType.
 * Single-file: schema, mapping, summary, context (one per ontology).
 * Multi-file: constraints, business-rules (many per ontology).
 *
 * @internal
 */
export enum ArtifactType {
  Schema = 'schema',
  Constraints = 'constraints',
  Mapping = 'mapping',
  BusinessRules = 'business-rules',
  Summary = 'summary',
  Context = 'context',
  Functions = 'functions',
  Actions = 'actions',
}

/** @internal */
export enum ValidationSeverity {
  Error = 'ERROR',
  Warning = 'WARNING',
}

/**
 * Lifecycle state driven by artifacts: DRAFT until a valid mapping is uploaded, DEPLOYED after, BROKEN if a required artifact is removed.
 *
 * @internal
 */
export enum OntologyState {
  Draft = 'DRAFT',
  Deployed = 'DEPLOYED',
  Broken = 'BROKEN',
}

/** @internal */
export interface OntologyCreateOptions {
  displayName?: string;
  description?: string;
  folderKey?: string;
}

/** @internal */
export interface OntologyUpdateOptions {
  /** Rename the ontology (GUID stays stable); 409 if the new name is already taken. */
  name?: string;
  displayName?: string;
  description?: string;
}

/** @internal */
export interface OntologyGetAllOptions {
  search?: string;
  folderKey?: string;
  pageSize?: number;
  cursor?: PaginationCursor;
  jumpToPage?: number;
}

/** @internal */
export interface ArtifactListOptions {
  /** Filter artifacts by semantic type. */
  type?: ArtifactType;
}

/** @internal */
export interface ArtifactUpsertRequest {
  mediaType: string;
  content: string;
  /** Semantic type; required when creating and not inferrable from mediaType. */
  type?: ArtifactType;
}

/** @internal */
export interface ArtifactBulkItem {
  fileName: string;
  /** Semantic type — becomes the multipart part name. */
  type: ArtifactType;
  /** MIME type of the content (e.g. "text/owl-functional", "text/turtle"). */
  mediaType: string;
  content: string;
}

/** @internal */
export interface RawOntologySummary {
  id: string;
  /** User-supplied name — unique per tenant/folder. */
  name: string;
  displayName: string;
  description?: string;
  /** Folder the ontology belongs to. */
  folderId?: string;
  state?: OntologyState;
  createdBy?: string;
  createTime?: string;
  updatedBy?: string;
  updateTime?: string;
}

/** @internal */
export interface ArtifactMetadata {
  /** Unique per ontology; extension required (e.g. schema.ofn, po-shapes.ttl). */
  fileName: string;
  type: ArtifactType;
  /** MIME type (e.g. "text/turtle", "text/owl-functional"). */
  mediaType: string;
  sizeBytes: number;
  /** SHA-256 hex checksum (also the ETag). */
  checksum: string;
  createdBy?: string;
  createTime?: string;
  updatedBy?: string;
  updateTime?: string;
}

/** @internal */
export interface ValidationViolation {
  severity: ValidationSeverity;
  message: string;
  line?: number;
}

/** @internal */
export interface ValidationResult {
  valid: boolean;
  type: ArtifactType;
  violations: ValidationViolation[];
}
