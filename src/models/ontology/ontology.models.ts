import type {
  OntologyGetResponse,
  OntologyValidateArtifactContentResponse,
  OntologyValidateArtifactContentOptions,
  OntologyGetAllOptions,
  OntologyGetByIdOptions,
  OntologyGetByNameOptions,
} from './ontology.types';
import type { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '@/utils/pagination/types';

/**
 *
 * @experimental
 *
 * /// warning
 * Preview: This service is experimental and may change or be removed in future releases.
 * ///
 *
 * Read-only access to deployed UiPath Ontologies and stateless validation of
 * ontology artifact content. Ontologies are authored as solution resources, so
 * the SDK does not create, change or delete them.
 */
export interface OntologyServiceModel {
  /**
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Lists ontologies across every folder, or in one folder when `folderKey` is given,
   * with optional search, state filter and pagination. Without pagination options,
   * every ontology is returned.
   *
   * Each ontology includes its name, display name, lifecycle state, folder and audit fields.
   *
   * @param options - Optional folder (omit to list every folder), search, state filter and pagination options
   * @returns Promise resolving to the {@link OntologyGetResponse} list, or a paginated response when pagination options are provided
   *
   * @example
   * ```typescript
   * import { Ontologies, OntologyState } from '@uipath/uipath-typescript/ontologies';
   *
   * const ontologies = new Ontologies(sdk);
   *
   * // Get all, across every folder
   * const all = await ontologies.getAll();
   *
   * // In one folder
   * const inFolder = await ontologies.getAll({ folderKey: '<folderKey>' });
   *
   * // Search by name
   * const filtered = await ontologies.getAll({ search: 'ecommerce' });
   *
   * // Only deployed ontologies
   * const deployed = await ontologies.getAll({ state: OntologyState.Deployed });
   *
   * // Paginated
   * const page = await ontologies.getAll({ pageSize: 10 });
   * if (page.hasNextPage) {
   *   const next = await ontologies.getAll({ cursor: page.nextCursor });
   * }
   * ```
   */
  getAll<T extends OntologyGetAllOptions>(options?: T): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<OntologyGetResponse> : NonPaginatedResponse<OntologyGetResponse>>;

  /**
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Gets a single ontology by its ID.
   *
   * First, get ontology IDs with `ontologies.getAll()`.
   *
   * @param id - Ontology ID (GUID)
   * @param options - Optional folder to read from; defaults to the configured folder
   * @returns Promise resolving to the {@link OntologyGetResponse}, including the key of the folder it belongs to
   *
   * @example
   * ```typescript
   * const ontologies = new Ontologies(sdk);
   * const ontology = await ontologies.getById('<ontologyId>');
   * ```
   *
   * @example
   * ```typescript
   * const ontologies = new Ontologies(sdk);
   * const ontology = await ontologies.getById('<ontologyId>', { folderKey: '<folderKey>' });
   * console.log(ontology.state, ontology.folderKey);
   * ```
   */
  getById(id: string, options?: OntologyGetByIdOptions): Promise<OntologyGetResponse>;

  /**
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Gets a single ontology by its name.
   *
   * In an app deployed with a solution, the name is redirected to the ontology the
   * solution's resource overrides point to, so code can use the design-time name.
   *
   * @param name - Ontology name (case-sensitive)
   * @param options - Optional folder to read from; defaults to the configured folder
   * @returns Promise resolving to the {@link OntologyGetResponse}, including the key of the folder it belongs to
   *
   * @example
   * ```typescript
   * const ontologies = new Ontologies(sdk);
   * const ontology = await ontologies.getByName('<ontologyName>');
   * ```
   *
   * @example
   * ```typescript
   * const ontologies = new Ontologies(sdk);
   * const ontology = await ontologies.getByName('<ontologyName>', { folderKey: '<folderKey>' });
   * console.log(ontology.id, ontology.state);
   * ```
   */
  getByName(name: string, options?: OntologyGetByNameOptions): Promise<OntologyGetResponse>;

  /**
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Validates artifact content without an ontology and without storing anything.
   *
   * Invalid content does not throw; check `valid` and `violations` in the result.
   *
   * @param fileName - Artifact filename (extension required, e.g. `po-shapes.ttl`)
   * @param content - Raw artifact content to validate
   * @param mediaType - MIME type of the content (e.g. `text/turtle`)
   * @param options - Optional semantic type hint
   * @returns Promise resolving to the {@link OntologyValidateArtifactContentResponse}, including any violations
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
   * import { Ontologies, OntologyArtifactType } from '@uipath/uipath-typescript/ontologies';
   *
   * const ontologies = new Ontologies(sdk);
   * const result = await ontologies.validateArtifactContent(
   *   'po-shapes.ttl',
   *   '@prefix sh: … ',
   *   'text/turtle',
   *   { type: OntologyArtifactType.Constraints }
   * );
   * if (!result.valid) {
   *   result.violations.forEach(v => console.error(v.severity, v.message));
   * }
   * ```
   */
  validateArtifactContent(fileName: string, content: string, mediaType: string, options?: OntologyValidateArtifactContentOptions): Promise<OntologyValidateArtifactContentResponse>;
}
