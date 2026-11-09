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
import { RawOntologyGetResponse } from '@/models/ontology/ontology.internal-types';
import { ONTOLOGY_PAGINATION, ONTOLOGY_OFFSET_PARAMS } from '@/utils/constants/common';
import { ONTOLOGY_ENDPOINTS } from '@/utils/constants/endpoints';
import { FOLDER_KEY } from '@/utils/constants/headers';
import { createHeaders } from '@/utils/http/headers';
import { HasPaginationOptions, PaginatedResponse, NonPaginatedResponse } from '@/utils/pagination/types';
import { PaginationHelpers } from '@/utils/pagination/helpers';
import { PaginationType } from '@/utils/pagination/internal-types';
import { transformData } from '@/utils/transform';
import { BaseService } from '@/services/base';

export class OntologyService extends BaseService implements OntologyServiceModel {
  @track('Ontologies.GetAll')
  async getAll<T extends OntologyGetAllOptions>(options?: T): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<OntologyGetResponse> : NonPaginatedResponse<OntologyGetResponse>> {
    return PaginationHelpers.getAll<T, RawOntologyGetResponse, OntologyGetResponse>(
      {
        serviceAccess: this.createPaginationServiceAccess(),
        getEndpoint: () => ONTOLOGY_ENDPOINTS.COLLECTION,
        transformFn: (raw) => transformData(raw, OntologyMap) as OntologyGetResponse,
        // The list route takes the folder as a `folder` query parameter, not the folder-key header.
        processParametersFn: ({ folderKey, ...rest }) => ({ ...rest, folder: folderKey ?? this.config.folderKey }),
        excludeFromPrefix: ['search', 'folder'],
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
    return transformData(response.data, OntologyMap) as OntologyGetResponse;
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
}
