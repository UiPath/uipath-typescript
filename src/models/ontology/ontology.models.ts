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
 *
 * @internal
 */
export interface OntologySummary extends Omit<RawOntologySummary, 'createTime' | 'updateTime'> {
  createdTime?: string;
  updatedTime?: string;
}

/**
 * Read-only access to deployed UiPath Ontologies and stateless validation of
 * ontology artifact content. Ontologies are authored as solution resources, so
 * the SDK does not create, change or delete them.
 *
 * @internal
 */
export interface OntologyServiceModel {
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
   *
   * @internal
   */
  getAll<T extends OntologyGetAllOptions>(options?: T): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<OntologySummary> : NonPaginatedResponse<OntologySummary>>;

  /**
   * Gets a single ontology by its GUID or name.
   *
   * @param idOrName - Ontology GUID or name (GUID is checked first)
   * @param options - Optional folder to read from; defaults to the configured folder
   * @returns The ontology; `folderId` is the folder the service reports
   *
   * @example
   * ```typescript
   * const ontologies = new Ontologies(sdk);
   * // By name
   * const o1 = await ontologies.getById('ecommerce');
   * // By GUID
   * const o2 = await ontologies.getById('a1b2c3d4-...');
   * // In a specific folder
   * const o3 = await ontologies.getById('ecommerce', { folderKey: '<folderKey>' });
   * console.log(o3.folderId);
   * ```
   *
   * @internal
   */
  getById(idOrName: string, options?: OntologyGetByIdOptions): Promise<OntologySummary>;

  /**
   * Validates artifact content without an ontology and without storing anything.
   *
   * Always returns 200; inspect the `valid` field in the response.
   *
   * @param fileName - Artifact filename (extension required, e.g. `po-shapes.ttl`)
   * @param content - Raw artifact content to validate
   * @param mediaType - MIME type of the content (e.g. `text/turtle`)
   * @param options - Optional semantic type hint
   * @returns Validation outcome including any violations
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
   *
   * @internal
   */
  validateArtifactContent(fileName: string, content: string, mediaType: string, options?: ArtifactContentValidateOptions): Promise<ValidationResult>;
}
