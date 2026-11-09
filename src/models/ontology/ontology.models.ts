import type {
  RawOntologySummary,
  ValidationResult,
  ArtifactContentValidateOptions,
  OntologyGetAllOptions,
  OntologyGetByIdOptions,
} from './ontology.types';
import type { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '@/utils/pagination/types';

/**
 * An ontology as the service returns it.
 */
export interface OntologySummary extends Omit<RawOntologySummary, 'createTime' | 'updateTime'> {
  /** Creation timestamp (ISO 8601). */
  createdTime?: string;
  /** Last update timestamp (ISO 8601). */
  updatedTime?: string;
}

/**
 * Read-only access to deployed UiPath Ontologies and stateless validation of
 * ontology artifact content. Ontologies are authored as solution resources, so
 * the SDK does not create, change or delete them.
 */
export interface OntologyServiceModel {
  /**
   * Lists the ontologies in a folder with optional search and pagination.
   *
   * Each ontology includes its name, display name, lifecycle state, folder and audit fields.
   *
   * @param options - Optional search, folder scoping, and pagination options
   * @returns Promise resolving to the {@link OntologySummary} list, or a paginated response when pagination options are provided
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
   * if (page.hasNextPage) {
   *   const next = await ontologies.getAll({ cursor: page.nextCursor });
   * }
   * ```
   */
  getAll<T extends OntologyGetAllOptions>(options?: T): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<OntologySummary> : NonPaginatedResponse<OntologySummary>>;

  /**
   * Gets a single ontology by its ID or name.
   *
   * First, get ontology IDs and names with `ontologies.getAll()`.
   *
   * @param idOrName - Ontology ID (GUID) or name; an ID is matched first
   * @param options - Optional folder to read from; defaults to the configured folder
   * @returns Promise resolving to the {@link OntologySummary}, including the key of the folder it belongs to in `folderId`
   *
   * @example
   * ```typescript
   * const ontologies = new Ontologies(sdk);
   *
   * // By ID
   * const ontology = await ontologies.getById('<ontologyId>');
   *
   * // By name, in a specific folder
   * const byName = await ontologies.getById('<ontologyName>', { folderKey: '<folderKey>' });
   * console.log(byName.state, byName.folderId);
   * ```
   */
  getById(idOrName: string, options?: OntologyGetByIdOptions): Promise<OntologySummary>;

  /**
   * Validates artifact content without an ontology and without storing anything.
   *
   * Invalid content does not throw; check `valid` and `violations` in the result.
   *
   * @param fileName - Artifact filename (extension required, e.g. `po-shapes.ttl`)
   * @param content - Raw artifact content to validate
   * @param mediaType - MIME type of the content (e.g. `text/turtle`)
   * @param options - Optional semantic type hint
   * @returns Promise resolving to the {@link ValidationResult}, including any violations
   *
   * @example
   * ```typescript
   * const ontologies = new Ontologies(sdk);
   * const result = await ontologies.validateArtifactContent('<fileName>.owl', '<content>', 'text/owl-functional');
   * console.log(result.valid);
   * ```
   *
   * @example
   * ```typescript
   * import { Ontologies, ArtifactType } from '@uipath/uipath-typescript/ontologies';
   *
   * const ontologies = new Ontologies(sdk);
   * const result = await ontologies.validateArtifactContent(
   *   'po-shapes.ttl',
   *   '@prefix sh: … ',
   *   'text/turtle',
   *   { type: ArtifactType.Constraints }
   * );
   * if (!result.valid) {
   *   result.violations.forEach(v => console.error(v.severity, v.message));
   * }
   * ```
   */
  validateArtifactContent(fileName: string, content: string, mediaType: string, options?: ArtifactContentValidateOptions): Promise<ValidationResult>;
}
