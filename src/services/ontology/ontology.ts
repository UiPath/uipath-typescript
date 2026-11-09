import { track } from '@/core/telemetry';
import { OntologyServiceModel } from '@/models/ontology/ontology.models';
import { OntologyMap } from '@/models/ontology/ontology.constants';
import {
  OntologyGetResponse,
  OntologyValidateArtifactContentResponse,
  OntologyGetAllOptions,
  OntologyGetByIdOptions,
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
        // The list route takes the folder as a `folder` query parameter; omitting it lists every folder.
        processParametersFn: ({ folderKey, ...rest }) => ({ ...rest, folder: folderKey }),
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
  async getById(idOrName: string, options?: OntologyGetByIdOptions): Promise<OntologyGetResponse> {
    const response = await this.get<RawOntologyGetResponse>(
      ONTOLOGY_ENDPOINTS.BY_ID(idOrName),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey ?? this.config.folderKey }) }
    );
    return this.toOntology(response.data);
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
   * Fetches every page of the ontology list and returns the combined result.
   */
  private async getAllPages(options: OntologyGetAllOptions): Promise<NonPaginatedResponse<OntologyGetResponse>> {
    const { search, state, folderKey } = options;
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
