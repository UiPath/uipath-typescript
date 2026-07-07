import type {
  RawOntologySummary,
  ArtifactMetadata,
  ArtifactEnvelope,
  ValidationResult,
  ArtifactUpsertRequest,
  ArtifactBulkItem,
  ArtifactListOptions,
  OntologyUpdateOptions,
  OntologyCreateOptions,
  OntologyGetAllOptions,
  ArtifactType,
} from './ontology.types';
import type { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination/types';

/**
 * Composed response type — raw API data plus bound instance methods.
 */
export type OntologySummary = RawOntologySummary & OntologyMethods;

/**
 * Service for managing UiPath Ontologies and their artifacts.
 *
 * @internal This service is under active development and not yet part of the public API.
 */
export interface OntologyServiceModel {
  /**
   * Creates a new ontology.
   *
   * The `name` must be non-blank, ≤64 characters, and must not contain '/'.
   * Names are unique per tenant/folder — a 409 is thrown if a duplicate exists.
   *
   * @param name - Unique name (max 64 chars, no '/')
   * @param options - Optional display name, description, and folder scoping
   * @returns The created ontology with bound methods
   *
   * @example
   * ```typescript
   * import { Ontologies } from '@uipath/uipath-typescript/ontologies';
   *
   * const ontologies = new Ontologies(sdk);
   * const ontology = await ontologies.create('ecommerce', {
   *   displayName: 'E-Commerce',
   *   description: 'Sales pipeline ontology',
   * });
   * console.log(ontology.id);
   * ```
   */
  create(name: string, options?: OntologyCreateOptions): Promise<OntologySummary>;

  /**
   * Lists all ontologies with optional search and pagination.
   *
   * @param options - Optional search, folder scoping, and pagination options
   * @returns Array of ontologies, or a paginated response when pagination options are provided
   *
   * @example
   * ```typescript
   * const ontologies = new Ontologies(sdk);
   *
   * // Get all
   * const all = await ontologies.getAll();
   *
   * // Search by name
   * const filtered = await ontologies.getAll({ search: 'ecommerce' });
   *
   * // Paginated
   * const page = await ontologies.getAll({ pageSize: 10 });
   * const next = await ontologies.getAll({ cursor: page.nextCursor });
   * ```
   */
  getAll<T extends OntologyGetAllOptions>(options?: T): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<OntologySummary> : NonPaginatedResponse<OntologySummary>>;

  /**
   * Gets a single ontology by its GUID or name.
   *
   * @param idOrName - Ontology GUID or name (GUID is checked first)
   * @returns The ontology with bound methods
   *
   * @example
   * ```typescript
   * const ontologies = new Ontologies(sdk);
   * // By name
   * const o1 = await ontologies.getById('ecommerce');
   * // By GUID
   * const o2 = await ontologies.getById('a1b2c3d4-...');
   * ```
   */
  getById(idOrName: string): Promise<OntologySummary>;

  /**
   * Updates ontology metadata. Only supplied fields are changed; omitted fields are left unchanged.
   *
   * @param idOrName - Ontology GUID or name
   * @param updates - Fields to update; `name` renames the ontology (GUID stays stable)
   * @returns The updated ontology with bound methods
   *
   * @example
   * ```typescript
   * const ontologies = new Ontologies(sdk);
   * const updated = await ontologies.update('ecommerce', {
   *   displayName: 'E-Commerce v2',
   *   description: 'Updated sales pipeline ontology',
   * });
   * ```
   */
  update(idOrName: string, updates: OntologyUpdateOptions): Promise<OntologySummary>;

  /**
   * Deletes an ontology and cascades the delete to all its artifacts.
   *
   * @param idOrName - Ontology GUID or name
   *
   * @example
   * ```typescript
   * const ontologies = new Ontologies(sdk);
   * await ontologies.deleteById('ecommerce');
   * ```
   */
  deleteById(idOrName: string): Promise<void>;

  /**
   * Exports the complete ontology as a zip archive.
   *
   * The archive contains every artifact as a top-level file under its real `fileName`,
   * plus `ontology.json` — the ontology metadata and an `artifacts` manifest array.
   * An ontology with no artifacts yields a zip containing only `ontology.json`.
   *
   * @param idOrName - Ontology GUID or name
   * @returns Raw zip bytes (`Uint8Array`) ready to write to disk or stream
   *
   * @example
   * ```typescript
   * import { writeFile } from 'node:fs/promises';
   * import { Ontologies } from '@uipath/uipath-typescript/ontologies';
   *
   * const ontologies = new Ontologies(sdk);
   * const zip = await ontologies.exportOntology('ecommerce');
   * await writeFile('ecommerce.zip', zip);
   * ```
   */
  exportOntology(idOrName: string): Promise<Uint8Array>;

  /**
   * Lists metadata for all artifacts of an ontology (no content).
   *
   * @param idOrName - Ontology GUID or name
   * @param options - Optional filter (e.g. `type`) to narrow results
   * @returns Array of artifact metadata records
   *
   * @example
   * ```typescript
   * const ontologies = new Ontologies(sdk);
   *
   * // All artifacts
   * const all = await ontologies.listArtifacts('ecommerce');
   *
   * // Only constraints
   * const shapes = await ontologies.listArtifacts('ecommerce', { type: ArtifactType.Constraints });
   * shapes.forEach(a => console.log(a.fileName, a.sizeBytes));
   * ```
   */
  listArtifacts(idOrName: string, options?: ArtifactListOptions): Promise<ArtifactMetadata[]>;

  /**
   * Downloads a single artifact's raw content.
   *
   * The backend returns the artifact as raw bytes with its stored Content-Type
   * (e.g. text/turtle, text/owl-functional, application/json). The content is
   * returned as a plain string — print it, save it, or parse it as needed.
   *
   * @param idOrName - Ontology GUID or name
   * @param fileName - Artifact filename (e.g. `schema.ofn`, `po-shapes.ttl`)
   * @returns Raw artifact content as a string
   *
   * @example
   * ```typescript
   * import { Ontologies } from '@uipath/uipath-typescript/ontologies';
   *
   * const ontologies = new Ontologies(sdk);
   * const content = await ontologies.getArtifact('ecommerce', 'schema.ofn');
   * console.log(content);
   * ```
   */
  getArtifact(idOrName: string, fileName: string): Promise<string>;

  /**
   * Upserts a single artifact. First call inserts; subsequent calls replace content.
   *
   * The artifact type is determined by: `request.type` > `?type=` > Content-Type inference.
   * If the type is ambiguous and not provided, a 400 is thrown.
   *
   * @param idOrName - Ontology GUID or name
   * @param fileName - Artifact filename (extension required, e.g. `schema.ofn`)
   * @param request - Artifact media type, content, and optional type hint
   * @returns Updated artifact metadata (content not echoed)
   *
   * @example
   * ```typescript
   * import { Ontologies, ArtifactType } from '@uipath/uipath-typescript/ontologies';
   *
   * const ontologies = new Ontologies(sdk);
   * const meta = await ontologies.upsertArtifact(
   *   'ecommerce',
   *   'schema.ofn',
   *   { mediaType: 'text/owl-functional', content: 'Ontology( … )' }
   * );
   * ```
   */
  upsertArtifact(idOrName: string, fileName: string, request: ArtifactUpsertRequest): Promise<ArtifactMetadata>;

  /**
   * Bulk-uploads multiple artifacts in a single call via `multipart/form-data`.
   *
   * Each item's `type` becomes the multipart part name, `fileName` becomes the part's filename,
   * and `mediaType` becomes the part's Content-Type. Additive: files not mentioned are untouched.
   * A part whose `fileName` already exists under a different `type` → 409. Single-file types
   * (`schema`, `mapping`, `summary`, `context`) allow only one file per type per ontology.
   *
   * @param idOrName - Ontology GUID or name
   * @param items - Artifacts to upload; `type` is required for every item
   * @returns Full resulting artifact metadata set (no content)
   *
   * @example
   * ```typescript
   * import { Ontologies, ArtifactType } from '@uipath/uipath-typescript/ontologies';
   *
   * const ontologies = new Ontologies(sdk);
   * const results = await ontologies.uploadArtifacts('ecommerce', [
   *   { fileName: 'schema.ofn', type: ArtifactType.Schema, mediaType: 'text/owl-functional', content: 'Ontology( … )' },
   *   { fileName: 'po-shapes.ttl', type: ArtifactType.Constraints, mediaType: 'text/turtle', content: '@prefix sh: … ' },
   *   { fileName: 'supplier-shapes.ttl', type: ArtifactType.Constraints, mediaType: 'text/turtle', content: '@prefix sh: … ' },
   * ]);
   * ```
   */
  uploadArtifacts(idOrName: string, items: ArtifactBulkItem[]): Promise<ArtifactMetadata[]>;

  /**
   * Deletes a single artifact from an ontology.
   *
   * @param idOrName - Ontology GUID or name
   * @param fileName - Artifact filename to delete
   *
   * @example
   * ```typescript
   * import { Ontologies } from '@uipath/uipath-typescript/ontologies';
   *
   * const ontologies = new Ontologies(sdk);
   * await ontologies.deleteArtifact('ecommerce', 'po-shapes.ttl');
   * ```
   */
  deleteArtifact(idOrName: string, fileName: string): Promise<void>;

  /**
   * Validates artifact content without writing it.
   *
   * Always returns 200; inspect the `valid` field in the response.
   *
   * @param idOrName - Ontology GUID or name
   * @param fileName - Artifact filename (determines the type context if already stored)
   * @param request - Content and media type to validate
   * @returns Validation outcome including any violations
   *
   * @example
   * ```typescript
   * import { Ontologies, ArtifactType } from '@uipath/uipath-typescript/ontologies';
   *
   * const ontologies = new Ontologies(sdk);
   * const result = await ontologies.validateArtifact(
   *   'ecommerce',
   *   'po-shapes.ttl',
   *   { mediaType: 'text/turtle', content: '@prefix sh: … ', type: ArtifactType.Constraints }
   * );
   * if (!result.valid) {
   *   result.violations.forEach(v => console.error(v.severity, v.message));
   * }
   * ```
   */
  validateArtifact(idOrName: string, fileName: string, request: ArtifactUpsertRequest): Promise<ValidationResult>;
}

/**
 * Methods bound to an {@link OntologySummary} response object.
 * These delegate to the service using the ontology's own `id`.
 */
export interface OntologyMethods {
  update(updates: OntologyUpdateOptions): Promise<OntologySummary>;
  deleteById(): Promise<void>;
  exportOntology(): Promise<Uint8Array>;
  listArtifacts(options?: ArtifactListOptions): Promise<ArtifactMetadata[]>;
  getArtifact(fileName: string): Promise<string>;
  upsertArtifact(fileName: string, request: ArtifactUpsertRequest): Promise<ArtifactMetadata>;
  uploadArtifacts(items: ArtifactBulkItem[]): Promise<ArtifactMetadata[]>;
  deleteArtifact(fileName: string): Promise<void>;
  validateArtifact(fileName: string, request: ArtifactUpsertRequest): Promise<ValidationResult>;
}

function createOntologyMethods(data: RawOntologySummary, service: OntologyServiceModel): OntologyMethods {
  if (!data.id) throw new Error('Ontology id is required for method binding');
  return {
    update: (updates) => service.update(data.id, updates),
    deleteById: () => service.deleteById(data.id),
    exportOntology: () => service.exportOntology(data.id),
    listArtifacts: (options) => service.listArtifacts(data.id, options),
    getArtifact: (fileName) => service.getArtifact(data.id, fileName),
    upsertArtifact: (fileName, request) => service.upsertArtifact(data.id, fileName, request),
    uploadArtifacts: (items) => service.uploadArtifacts(data.id, items),
    deleteArtifact: (fileName) => service.deleteArtifact(data.id, fileName),
    validateArtifact: (fileName, request) => service.validateArtifact(data.id, fileName, request),
  };
}

export function createOntologyWithMethods(data: RawOntologySummary, service: OntologyServiceModel): OntologySummary {
  return Object.assign({}, data, createOntologyMethods(data, service));
}

// Re-export types consumers need when importing from this module
export type {
  RawOntologySummary,
  ArtifactMetadata,
  ArtifactEnvelope,
  ValidationResult,
  ArtifactUpsertRequest,
  ArtifactBulkItem,
  ArtifactListOptions,
  OntologyUpdateOptions,
  OntologyCreateOptions,
  OntologyGetAllOptions,
  ArtifactType,
};
