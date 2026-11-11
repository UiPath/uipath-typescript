import { track } from '@/core/telemetry';
import { OntologyServiceModel } from '@/models/ontology/ontology.models';
import { OntologyMap } from '@/models/ontology/ontology.constants';
import {
  OntologyGetResponse,
  OntologyValidateArtifactContentResponse,
  OntologyGetAllOptions,
  OntologyGetByIdOptions,
  OntologyGetByNameOptions,
  OntologyValidateArtifactContentOptions,
} from '@/models/ontology/ontology.types';
import { RawOntologyGetResponse, RawOntologyListResponse } from '@/models/ontology/ontology.internal-types';
import { ONTOLOGY_PAGINATION, ONTOLOGY_OFFSET_PARAMS, ONTOLOGY_MAX_PAGE_SIZE } from '@/utils/constants/common';
import { ONTOLOGY_ENDPOINTS } from '@/utils/constants/endpoints';
import { FOLDER_KEY } from '@/utils/constants/headers';
import { createHeaders } from '@/utils/http/headers';
import { HasPaginationOptions, PaginatedResponse, NonPaginatedResponse } from '@/utils/pagination/types';
import { PaginationHelpers } from '@/utils/pagination/helpers';
import { PaginationType } from '@/utils/pagination/internal-types';
import { transformData } from '@/utils/transform';
import { resolveOverride } from '@/utils/overrides/resolve-override';
import { resolveFolderHeaders } from '@/utils/folder/folder-headers';
import { BaseService } from '@/services/base';

/**
 * Service for reading UiPath Ontologies and validating ontology artifact content.
 *
 * @experimental
 *
 * Method documentation lives on {@link OntologyServiceModel}, which this class implements.
 */
export class OntologyService extends BaseService implements OntologyServiceModel {
  @track('Ontologies.GetAll')
  async getAll<T extends OntologyGetAllOptions>(options?: T): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<OntologyGetResponse> : NonPaginatedResponse<OntologyGetResponse>> {
    // The list route always pages (default 20, max 100), so without pagination options
    // every page is fetched; a single request would silently truncate.
    const hasPaginationOptions =
      options?.pageSize !== undefined || options?.cursor !== undefined || options?.jumpToPage !== undefined;
    if (!hasPaginationOptions) {
      return this.getAllPages(options ?? {}) as Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<OntologyGetResponse> : NonPaginatedResponse<OntologyGetResponse>>;
    }

    return PaginationHelpers.getAll<T, RawOntologyGetResponse, OntologyGetResponse>(
      {
        serviceAccess: this.createPaginationServiceAccess(),
        getEndpoint: () => ONTOLOGY_ENDPOINTS.COLLECTION,
        transformFn: (raw) => this.toOntology(raw),
        // The list route takes a folder key as the `folder` query parameter and a folder path as
        // its header; with neither it lists every folder.
        headers: this.listFolderHeaders(options),
        processParametersFn: ({ folderKey, folderPath: _folderPath, ...rest }) => ({ ...rest, folder: folderKey }),
        excludeFromPrefix: ['search', 'state', 'folder'],
        pagination: {
          paginationType: PaginationType.OFFSET,
          itemsField: ONTOLOGY_PAGINATION.ITEMS_FIELD,
          totalCountField: ONTOLOGY_PAGINATION.TOTAL_COUNT_FIELD,
          paginationParams: {
            pageSizeParam: ONTOLOGY_OFFSET_PARAMS.PAGE_SIZE_PARAM,
            offsetParam: ONTOLOGY_OFFSET_PARAMS.OFFSET_PARAM,
            countParam: ONTOLOGY_OFFSET_PARAMS.COUNT_PARAM,
            convertToSkip: false,
            zeroBased: false,
          },
        },
      },
      options
    );
  }

  @track('Ontologies.GetById')
  async getById(id: string, options?: OntologyGetByIdOptions): Promise<OntologyGetResponse> {
    return this.fetchOntology(id, this.folderHeaders(options?.folderKey, options?.folderPath, 'Ontologies.getById'));
  }

  @track('Ontologies.GetByName')
  async getByName(name: string, options?: OntologyGetByNameOptions): Promise<OntologyGetResponse> {
    const override = resolveOverride('Ontology', name, options?.folderPath);
    const resolvedName = override?.name ?? name;
    // An override's folderPath redirects the folder, so it replaces the caller's folder: sent
    // alongside a folder key, the path would be ignored, as the service lets a key win.
    const headers = override?.folderPath
      ? this.folderHeaders(undefined, override.folderPath, 'Ontologies.getByName')
      : this.folderHeaders(options?.folderKey, options?.folderPath, 'Ontologies.getByName');
    return this.fetchOntology(resolvedName, headers);
  }

  @track('Ontologies.ValidateArtifactContent')
  async validateArtifactContent(fileName: string, content: string, mediaType: string, options?: OntologyValidateArtifactContentOptions): Promise<OntologyValidateArtifactContentResponse> {
    const response = await this.post<OntologyValidateArtifactContentResponse>(
      ONTOLOGY_ENDPOINTS.ARTIFACT.VALIDATE_CONTENT(fileName),
      content,
      {
        params: { type: options?.type },
        headers: { 'Content-Type': mediaType },
        bodyOptions: { stringify: false },
      }
    );
    return response.data;
  }

  /**
   * Reads one ontology; the route resolves its segment as an ID first, then as a name.
   */
  private async fetchOntology(idOrName: string, headers: Record<string, string>): Promise<OntologyGetResponse> {
    const response = await this.get<RawOntologyGetResponse>(ONTOLOGY_ENDPOINTS.BY_ID(idOrName), { headers });
    return this.toOntology(response.data);
  }

  /**
   * Folder headers for a single-ontology read. A folder key wins over a path, as it does on the
   * service, so only one is sent; with neither, the configured folder key is used, and without
   * that no folder header is sent (the service then looks in no folder).
   */
  private folderHeaders(folderKey: string | undefined, folderPath: string | undefined, resourceType: string): Record<string, string> {
    const key = folderKey?.trim();
    const path = folderPath?.trim();
    if (!key && !isFolderPath(path)) {
      return createHeaders({ [FOLDER_KEY]: this.config.folderKey });
    }
    return resolveFolderHeaders({
      folderKey: key || undefined,
      folderPath: key ? undefined : path,
      resourceType,
      fallbackFolderKey: this.config.folderKey,
    });
  }

  /**
   * The folder path header for a list. A folder key travels as the `folder` query parameter and
   * wins, so the path is sent only without one; the configured folder key is never applied, so
   * an unscoped list still covers every folder.
   */
  private listFolderHeaders(options: OntologyGetAllOptions | undefined): Record<string, string> {
    const path = options?.folderPath?.trim();
    if (options?.folderKey?.trim() || !isFolderPath(path)) {
      return {};
    }
    return resolveFolderHeaders({ folderPath: path, resourceType: 'Ontologies.getAll' });
  }

  /**
   * Fetches every page of the ontology list and returns the combined result.
   */
  private async getAllPages(options: OntologyGetAllOptions): Promise<NonPaginatedResponse<OntologyGetResponse>> {
    const { search, state, folderKey } = options;
    const headers = this.listFolderHeaders(options);
    const ontologiesById = new Map<string, OntologyGetResponse>();
    let totalCount = 0;

    for (let page = 1; ; page++) {
      const response = await this.get<RawOntologyListResponse>(ONTOLOGY_ENDPOINTS.COLLECTION, {
        params: {
          search,
          state,
          folder: folderKey,
          [ONTOLOGY_OFFSET_PARAMS.OFFSET_PARAM]: page,
          [ONTOLOGY_OFFSET_PARAMS.PAGE_SIZE_PARAM]: ONTOLOGY_MAX_PAGE_SIZE,
        },
        headers,
      });
      const { items, total } = response.data;
      totalCount = total;
      for (const raw of items) {
        const ontology = this.toOntology(raw);
        // Dedupe by id so an ontology that shifts across a page boundary is not counted twice.
        ontologiesById.set(ontology.id, ontology);
      }

      // A short page is the last one; the count check stops after a full final page.
      if (items.length < ONTOLOGY_MAX_PAGE_SIZE || ontologiesById.size >= totalCount) {
        break;
      }
    }

    return { items: [...ontologiesById.values()], totalCount };
  }

  private toOntology(raw: RawOntologyGetResponse): OntologyGetResponse {
    return transformData(raw, OntologyMap) as OntologyGetResponse;
  }
}

/** Whether `path` names a folder: `'.'` (the current folder) reads as no path, as in `resolveFolderHeaders`. */
function isFolderPath(path: string | undefined): path is string {
  return !!path && path !== '.';
}
