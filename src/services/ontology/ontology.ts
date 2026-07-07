import { track } from '../../core/telemetry';
import {
  OntologySummary,
  OntologyServiceModel,
  createOntologyWithMethods,
} from '../../models/ontology/ontology.models';
import {
  RawOntologySummary,
  ArtifactMetadata,
  ValidationResult,
  OntologyCreateOptions,
  OntologyUpdateOptions,
  OntologyGetAllOptions,
  ArtifactUpsertRequest,
  ArtifactBulkItem,
  ArtifactListOptions,
} from '../../models/ontology/ontology.types';
import { ONTOLOGY_PAGINATION, ONTOLOGY_OFFSET_PARAMS } from '../../utils/constants/common';
import { ONTOLOGY_ENDPOINTS } from '../../utils/constants/endpoints';
import { FOLDER_KEY, RESPONSE_TYPES } from '../../utils/constants/headers';
import { createHeaders } from '../../utils/http/headers';
import { HasPaginationOptions, PaginatedResponse, NonPaginatedResponse } from '../../utils/pagination/types';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { PaginationType } from '../../utils/pagination/internal-types';
import { BaseService } from '../base';

export class OntologyService extends BaseService implements OntologyServiceModel {
  @track('Ontologies.Create')
  async create(name: string, options?: OntologyCreateOptions): Promise<OntologySummary> {
    const { folderKey, ...metadata } = options ?? {};
    const response = await this.post<RawOntologySummary>(
      ONTOLOGY_ENDPOINTS.CREATE,
      { name, ...metadata },
      { headers: createHeaders({ [FOLDER_KEY]: folderKey ?? this.config.folderKey }) }
    );
    return createOntologyWithMethods(response.data, this);
  }

  @track('Ontologies.GetAll')
  async getAll<T extends OntologyGetAllOptions>(options?: T): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<OntologySummary> : NonPaginatedResponse<OntologySummary>> {
    const { folderKey, ...restOptions } = options ?? {};
    return PaginationHelpers.getAll<T, RawOntologySummary, OntologySummary>(
      {
        serviceAccess: this.createPaginationServiceAccess(),
        getEndpoint: () => ONTOLOGY_ENDPOINTS.GET_ALL,
        headers: createHeaders({ [FOLDER_KEY]: folderKey ?? this.config.folderKey }),
        transformFn: (raw) => createOntologyWithMethods(raw, this),
        excludeFromPrefix: ['search'],
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
      restOptions as T
    );
  }

  @track('Ontologies.GetById')
  async getById(idOrName: string): Promise<OntologySummary> {
    const response = await this.get<RawOntologySummary>(ONTOLOGY_ENDPOINTS.GET_BY_ID(idOrName));
    return createOntologyWithMethods(response.data, this);
  }

  @track('Ontologies.Update')
  async update(idOrName: string, updates: OntologyUpdateOptions): Promise<OntologySummary> {
    const response = await this.patch<RawOntologySummary>(
      ONTOLOGY_ENDPOINTS.UPDATE(idOrName),
      updates
    );
    return createOntologyWithMethods(response.data, this);
  }

  @track('Ontologies.Delete')
  async deleteById(idOrName: string): Promise<void> {
    await this.delete<void>(ONTOLOGY_ENDPOINTS.DELETE(idOrName));
  }

  @track('Ontologies.Export')
  async exportOntology(idOrName: string): Promise<Uint8Array> {
    const response = await this.get<Blob>(
      ONTOLOGY_ENDPOINTS.EXPORT(idOrName),
      { responseType: RESPONSE_TYPES.BLOB }
    );
    const arrayBuffer = await response.data.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  @track('Ontologies.ListArtifacts')
  async listArtifacts(idOrName: string, options?: ArtifactListOptions): Promise<ArtifactMetadata[]> {
    const url = options?.type
      ? `${ONTOLOGY_ENDPOINTS.ARTIFACT.GET_ALL(idOrName)}?type=${encodeURIComponent(options.type)}`
      : ONTOLOGY_ENDPOINTS.ARTIFACT.GET_ALL(idOrName);
    const response = await this.get<ArtifactMetadata[]>(url);
    return response.data;
  }

  @track('Ontologies.GetArtifact')
  async getArtifact(idOrName: string, fileName: string): Promise<string> {
    const response = await this.get<string>(
      ONTOLOGY_ENDPOINTS.ARTIFACT.GET(idOrName, fileName),
      { responseType: RESPONSE_TYPES.TEXT }
    );
    return response.data;
  }

  @track('Ontologies.UpsertArtifact')
  async upsertArtifact(idOrName: string, fileName: string, request: ArtifactUpsertRequest): Promise<ArtifactMetadata> {
    if (!request.mediaType) {
      throw new Error(`upsertArtifact: --media-type is required (e.g. 'text/owl-functional', 'text/turtle')`);
    }
    // Real API: raw body + Content-Type = media type + ?type= query param (not a JSON wrapper).
    const url = request.type
      ? `${ONTOLOGY_ENDPOINTS.ARTIFACT.UPSERT(idOrName, fileName)}?type=${encodeURIComponent(request.type)}`
      : ONTOLOGY_ENDPOINTS.ARTIFACT.UPSERT(idOrName, fileName);
    const response = await this.put<ArtifactMetadata>(
      url,
      request.content,
      { headers: { 'Content-Type': request.mediaType }, bodyOptions: { stringify: false } }
    );
    return response.data;
  }

  @track('Ontologies.UploadArtifacts')
  async uploadArtifacts(idOrName: string, items: ArtifactBulkItem[]): Promise<ArtifactMetadata[]> {
    const formData = new FormData();
    for (const item of items) {
      formData.append(item.type, new Blob([item.content], { type: item.mediaType }), item.fileName);
    }
    const response = await this.post<ArtifactMetadata[]>(
      ONTOLOGY_ENDPOINTS.ARTIFACT.UPLOAD_BULK(idOrName),
      formData
    );
    return response.data;
  }

  @track('Ontologies.DeleteArtifact')
  async deleteArtifact(idOrName: string, fileName: string): Promise<void> {
    await this.delete<void>(ONTOLOGY_ENDPOINTS.ARTIFACT.DELETE(idOrName, fileName));
  }

  @track('Ontologies.ValidateArtifact')
  async validateArtifact(idOrName: string, fileName: string, request: ArtifactUpsertRequest): Promise<ValidationResult> {
    if (!request.mediaType) {
      throw new Error(`validateArtifact: --media-type is required (e.g. 'text/turtle', 'application/yaml')`);
    }
    // Real API: raw body + Content-Type = media type + ?type= query param (not a JSON wrapper).
    const url = request.type
      ? `${ONTOLOGY_ENDPOINTS.ARTIFACT.VALIDATE(idOrName, fileName)}?type=${encodeURIComponent(request.type)}`
      : ONTOLOGY_ENDPOINTS.ARTIFACT.VALIDATE(idOrName, fileName);
    const response = await this.post<ValidationResult>(
      url,
      request.content,
      { headers: { 'Content-Type': request.mediaType }, bodyOptions: { stringify: false } }
    );
    return response.data;
  }
}
