import { ValidationError } from '../../core/errors';
import { BaseService } from '../base';
import {
  EntityV3ServiceModel,
  EntityV3GetResponse,
  EntityV3CreateResponse,
  createEntityV3WithMethods,
} from '../../models/data-fabric/entities-v3.models';
import {
  EntityV3Metadata,
  EntityV3ListResponse,
  EntityV3WriteResponse,
  EntityV3QueryExpansionResponse,
  EntityV3MemberDeleteResponse,
  EntityV3BatchResponse,
  EntityV3RecordInput,
  EntityV3ConditionalUpdateRequest,
  EntityV3CreateRequest,
  EntityV3UpdateMetadataRequest,
  EntityV3FieldCreateRequest,
  EntityV3FieldUpdateRequest,
  EntityV3AutopilotRequest,
  EntityV3AutopilotResponse,
  EntityV3GetAllOptions,
  EntityV3GetAllPagedOptions,
  EntityV3ReadOptions,
  EntityV3GetRecordOptions,
  EntityV3QueryOptions,
  EntityV3InsertOptions,
  EntityV3BatchOptions,
  EntityV3UpdateOptions,
  EntityV3DeleteOptions,
  EntityV3InsertBulkOptions,
  EntityV3UpdateWhereOptions,
  EntityV3DeleteBatchOptions,
  EntityV3MemberReadOptions,
  EntityV3MemberGetRecordOptions,
  EntityV3MemberQueryOptions,
  EntityV3UploadAttachmentOptions,
  EntityV3DownloadAttachmentOptions,
  EntityV3DeleteAttachmentOptions,
  EntityV3SchemaOptions,
} from '../../models/data-fabric/entities-v3.types';
import { EntityFileType } from '../../models/data-fabric/entities.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination/types';
import { PaginationType } from '../../utils/pagination/internal-types';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { ENTITY_PAGINATION, ENTITY_OFFSET_PARAMS, HTTP_METHODS } from '../../utils/constants/common';
import { DATA_FABRIC_V3_ENDPOINTS } from '../../utils/constants/endpoints/data-fabric';
import { FOLDER_KEY, RESPONSE_TYPES } from '../../utils/constants/headers';
import { createHeaders } from '../../utils/http/headers';
import { createParams } from '../../utils/http/params';
import { MAX_QUERY_JOINS } from '../../models/data-fabric/entities.constants';
import { track } from '../../core/telemetry';

/** Query/body keys that must not receive the OData `$` prefix on v3 query requests. */
const V3_QUERY_EXCLUDE_FROM_PREFIX = ['filterGroup', 'selectedFields', 'sortOptions', 'aggregates', 'groupBy', 'joins', 'childLimit'];

/** Shared OFFSET pagination config for v3 read/query endpoints (items in `value`, total in `totalRecordCount`, params `limit`/`start`). */
const V3_PAGINATION = {
  paginationType: PaginationType.OFFSET,
  itemsField: ENTITY_PAGINATION.ITEMS_FIELD,
  totalCountField: ENTITY_PAGINATION.TOTAL_COUNT_FIELD,
  paginationParams: {
    pageSizeParam: ENTITY_OFFSET_PARAMS.PAGE_SIZE_PARAM,
    offsetParam: ENTITY_OFFSET_PARAMS.OFFSET_PARAM,
    countParam: ENTITY_OFFSET_PARAMS.COUNT_PARAM,
  },
} as const;

/**
 * Service for the Data Fabric Entity **v3** API (composite-entity support).
 *
 * Data operations are addressed by entity name; schema operations by entity id.
 * Record field values are returned exactly as the API sends them.
 */
export class EntityV3Service extends BaseService implements EntityV3ServiceModel {
  // ----- Listing / metadata -------------------------------------------------

  @track('EntitiesV3.GetAll')
  async getAll(options?: EntityV3GetAllOptions): Promise<EntityV3Metadata[]> {
    const response = await this.get<EntityV3Metadata[]>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.LIST,
      {
        params: createParams({ entityClass: options?.entityClass }),
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
      }
    );
    return response.data;
  }

  @track('EntitiesV3.GetAllWithChoiceSets')
  async getAllWithChoiceSets(options?: EntityV3GetAllPagedOptions): Promise<EntityV3ListResponse> {
    const response = await this.get<EntityV3ListResponse>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.LIST_ALL,
      {
        params: createParams({ start: options?.start, limit: options?.limit }),
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
      }
    );
    return response.data;
  }

  @track('EntitiesV3.GetFolderEntities')
  async getFolderEntities(options?: EntityV3GetAllOptions): Promise<EntityV3Metadata[]> {
    const response = await this.get<EntityV3Metadata[]>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.FOLDER_ENTITIES,
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return response.data;
  }

  @track('EntitiesV3.GetById')
  async getById(entityId: string, options?: EntityV3SchemaOptions): Promise<EntityV3GetResponse> {
    const response = await this.get<EntityV3Metadata>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.GET_BY_ID(entityId),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return createEntityV3WithMethods(response.data, this);
  }

  @track('EntitiesV3.GetMetadata')
  async getMetadata(entityName: string, options?: EntityV3SchemaOptions): Promise<EntityV3GetResponse> {
    const response = await this.get<EntityV3Metadata>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.GET_METADATA(entityName),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return createEntityV3WithMethods(response.data, this);
  }

  // ----- Schema CUD ---------------------------------------------------------

  @track('EntitiesV3.Create')
  async create(request: EntityV3CreateRequest, options?: EntityV3SchemaOptions): Promise<EntityV3CreateResponse> {
    const response = await this.post<EntityV3CreateResponse>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.CREATE,
      request,
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return response.data;
  }

  @track('EntitiesV3.DeleteById')
  async deleteById(entityId: string, options?: EntityV3SchemaOptions): Promise<void> {
    await this.delete<void>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.DELETE_BY_ID(entityId),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
  }

  @track('EntitiesV3.UpdateMetadata')
  async updateMetadata(entityId: string, request: EntityV3UpdateMetadataRequest, options?: EntityV3SchemaOptions): Promise<boolean> {
    const response = await this.patch<boolean>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.UPDATE_METADATA(entityId),
      { entityId, ...request },
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return response.data;
  }

  @track('EntitiesV3.CreateField')
  async createField(entityId: string, request: EntityV3FieldCreateRequest, options?: EntityV3SchemaOptions): Promise<string> {
    const response = await this.post<string>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.FIELD.CREATE(entityId),
      { entityId, ...request },
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return response.data;
  }

  @track('EntitiesV3.UpdateField')
  async updateField(entityId: string, fieldId: string, request: EntityV3FieldUpdateRequest, options?: EntityV3SchemaOptions): Promise<boolean> {
    const response = await this.patch<boolean>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.FIELD.UPDATE(entityId, fieldId),
      { id: fieldId, ...request },
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return response.data;
  }

  @track('EntitiesV3.DeleteField')
  async deleteField(entityId: string, fieldId: string, options?: EntityV3SchemaOptions): Promise<boolean> {
    const response = await this.delete<boolean>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.FIELD.DELETE(entityId, fieldId),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return response.data;
  }

  // ----- Data reads ---------------------------------------------------------

  @track('EntitiesV3.GetRecords')
  async getRecords<T extends EntityV3ReadOptions = EntityV3ReadOptions>(
    entityName: string,
    options?: T
  ): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<EntityV3WriteResponse> : NonPaginatedResponse<EntityV3WriteResponse>> {
    const { folderKey, ...rest } = options ?? {};
    const downstreamOptions = options === undefined ? undefined : (rest as T);
    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => DATA_FABRIC_V3_ENDPOINTS.ENTITY.READ(entityName),
      headers: createHeaders({ [FOLDER_KEY]: folderKey }),
      pagination: V3_PAGINATION,
      excludeFromPrefix: ['expansionLevel'],
    }, downstreamOptions);
  }

  @track('EntitiesV3.GetRecord')
  async getRecord(entityName: string, recordId: string, options?: EntityV3GetRecordOptions): Promise<Record<string, unknown>> {
    const response = await this.get<Record<string, unknown>>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.READ_RECORD(entityName, recordId),
      {
        params: createParams({ expansionLevel: options?.expansionLevel }),
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
      }
    );
    return response.data;
  }

  @track('EntitiesV3.GetRecordByKey')
  async getRecordByKey(entityName: string, key: string, options?: EntityV3GetRecordOptions): Promise<Record<string, unknown>> {
    const response = await this.get<Record<string, unknown>>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.READ_BY_KEY(entityName, key),
      {
        params: createParams({ expansionLevel: options?.expansionLevel }),
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
      }
    );
    return response.data;
  }

  @track('EntitiesV3.Query')
  async query<T extends EntityV3QueryOptions = EntityV3QueryOptions>(
    entityName: string,
    options?: T
  ): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<EntityV3WriteResponse> : NonPaginatedResponse<EntityV3WriteResponse>> {
    if (options?.joins && options.joins.length > MAX_QUERY_JOINS) {
      throw new ValidationError({
        message: `A maximum of ${MAX_QUERY_JOINS} joins is supported per query (received ${options.joins.length})`,
      });
    }
    const { folderKey, expansionLevel, ...rest } = options ?? {};
    const downstreamOptions = options === undefined ? undefined : (rest as T);
    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => DATA_FABRIC_V3_ENDPOINTS.ENTITY.QUERY(entityName),
      method: HTTP_METHODS.POST,
      headers: createHeaders({ [FOLDER_KEY]: folderKey }),
      queryParams: createParams({ expansionLevel }),
      pagination: V3_PAGINATION,
      excludeFromPrefix: V3_QUERY_EXCLUDE_FROM_PREFIX,
    }, downstreamOptions);
  }

  @track('EntitiesV3.QueryWithExpansion')
  async queryWithExpansion(entityName: string, options?: EntityV3QueryOptions): Promise<EntityV3QueryExpansionResponse> {
    if (options?.joins && options.joins.length > MAX_QUERY_JOINS) {
      throw new ValidationError({
        message: `A maximum of ${MAX_QUERY_JOINS} joins is supported per query (received ${options.joins.length})`,
      });
    }
    // query_expansion is not SDK-paginated — send only the query body fields.
    const body = {
      filterGroup: options?.filterGroup,
      selectedFields: options?.selectedFields,
      sortOptions: options?.sortOptions,
      aggregates: options?.aggregates,
      groupBy: options?.groupBy,
      joins: options?.joins,
      childLimit: options?.childLimit,
    };
    const response = await this.post<EntityV3QueryExpansionResponse>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.QUERY_EXPANSION(entityName),
      body,
      {
        params: createParams({ expansionLevel: options?.expansionLevel }),
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
      }
    );
    return response.data;
  }

  // ----- Data writes --------------------------------------------------------

  @track('EntitiesV3.Insert')
  async insert(entityName: string, data: EntityV3RecordInput, options?: EntityV3InsertOptions): Promise<EntityV3WriteResponse> {
    const response = await this.post<EntityV3WriteResponse>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.INSERT(entityName),
      data,
      {
        params: createParams({ expansionLevel: options?.expansionLevel }),
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
      }
    );
    return response.data;
  }

  @track('EntitiesV3.InsertRecords')
  async insertRecords(entityName: string, data: EntityV3RecordInput[], options?: EntityV3BatchOptions): Promise<EntityV3BatchResponse> {
    const response = await this.post<EntityV3BatchResponse>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.INSERT_BATCH(entityName),
      data,
      {
        params: createParams({ expansionLevel: options?.expansionLevel, failOnFirst: options?.failOnFirst }),
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
      }
    );
    return response.data;
  }

  @track('EntitiesV3.InsertBulk')
  async insertBulk(entityName: string, data: EntityV3RecordInput[], options?: EntityV3InsertBulkOptions): Promise<boolean> {
    const response = await this.post<boolean>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.INSERT_BULK(entityName),
      data,
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return response.data;
  }

  @track('EntitiesV3.Upsert')
  async upsert(entityName: string, data: EntityV3RecordInput, options?: EntityV3InsertOptions): Promise<EntityV3WriteResponse> {
    const response = await this.post<EntityV3WriteResponse>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.UPSERT(entityName),
      data,
      {
        params: createParams({ expansionLevel: options?.expansionLevel }),
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
      }
    );
    return response.data;
  }

  @track('EntitiesV3.Update')
  async update(entityName: string, recordId: string, data: EntityV3RecordInput, options?: EntityV3UpdateOptions): Promise<EntityV3WriteResponse> {
    const response = await this.post<EntityV3WriteResponse>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.UPDATE(entityName, recordId),
      data,
      {
        params: createParams({ expansionLevel: options?.expansionLevel }),
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
      }
    );
    return response.data;
  }

  @track('EntitiesV3.UpdateByKey')
  async updateByKey(entityName: string, key: string, data: EntityV3RecordInput, options?: EntityV3UpdateOptions): Promise<EntityV3WriteResponse> {
    const response = await this.post<EntityV3WriteResponse>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.UPDATE_BY_KEY(entityName, key),
      data,
      {
        params: createParams({ expansionLevel: options?.expansionLevel }),
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
      }
    );
    return response.data;
  }

  @track('EntitiesV3.UpdateRecords')
  async updateRecords(entityName: string, data: EntityV3RecordInput[], options?: EntityV3BatchOptions): Promise<EntityV3BatchResponse> {
    const response = await this.post<EntityV3BatchResponse>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.UPDATE_BATCH(entityName),
      data,
      {
        params: createParams({ expansionLevel: options?.expansionLevel, failOnFirst: options?.failOnFirst }),
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
      }
    );
    return response.data;
  }

  @track('EntitiesV3.UpdateWhere')
  async updateWhere(entityName: string, request: EntityV3ConditionalUpdateRequest, options?: EntityV3UpdateWhereOptions): Promise<EntityV3WriteResponse> {
    const response = await this.post<EntityV3WriteResponse>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.UPDATE_WHERE(entityName),
      request,
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return response.data;
  }

  @track('EntitiesV3.DeleteRecord')
  async deleteRecord(entityName: string, recordId: string, options?: EntityV3DeleteOptions): Promise<EntityV3WriteResponse> {
    const response = await this.delete<EntityV3WriteResponse>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.DELETE_RECORD(entityName, recordId),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return response.data;
  }

  @track('EntitiesV3.DeleteRecords')
  async deleteRecords(entityName: string, recordIds: string[], options?: EntityV3DeleteOptions): Promise<EntityV3WriteResponse> {
    const response = await this.post<EntityV3WriteResponse>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.DELETE(entityName),
      recordIds,
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return response.data;
  }

  @track('EntitiesV3.DeleteRecordsBatch')
  async deleteRecordsBatch(entityName: string, recordIds: string[], options?: EntityV3DeleteBatchOptions): Promise<EntityV3BatchResponse> {
    const response = await this.post<EntityV3BatchResponse>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.DELETE_BATCH(entityName),
      recordIds,
      {
        params: createParams({ failOnFirst: options?.failOnFirst }),
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
      }
    );
    return response.data;
  }

  // ----- Members ------------------------------------------------------------

  @track('EntitiesV3.QueryMember')
  async queryMember<T extends EntityV3MemberQueryOptions = EntityV3MemberQueryOptions>(
    entityName: string,
    memberName: string,
    options?: T
  ): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<Record<string, unknown>> : NonPaginatedResponse<Record<string, unknown>>> {
    const { folderKey, ...rest } = options ?? {};
    const downstreamOptions = options === undefined ? undefined : (rest as T);
    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => DATA_FABRIC_V3_ENDPOINTS.MEMBER.QUERY(entityName, memberName),
      method: HTTP_METHODS.POST,
      headers: createHeaders({ [FOLDER_KEY]: folderKey }),
      pagination: V3_PAGINATION,
      excludeFromPrefix: V3_QUERY_EXCLUDE_FROM_PREFIX,
    }, downstreamOptions);
  }

  @track('EntitiesV3.GetMemberRecords')
  async getMemberRecords<T extends EntityV3MemberReadOptions = EntityV3MemberReadOptions>(
    entityName: string,
    memberName: string,
    options?: T
  ): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<Record<string, unknown>> : NonPaginatedResponse<Record<string, unknown>>> {
    const { folderKey, ...rest } = options ?? {};
    const downstreamOptions = options === undefined ? undefined : (rest as T);
    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => DATA_FABRIC_V3_ENDPOINTS.MEMBER.READ(entityName, memberName),
      headers: createHeaders({ [FOLDER_KEY]: folderKey }),
      pagination: V3_PAGINATION,
    }, downstreamOptions);
  }

  @track('EntitiesV3.GetMemberRecord')
  async getMemberRecord(entityName: string, memberName: string, recordId: string, options?: EntityV3MemberGetRecordOptions): Promise<Record<string, unknown>> {
    const response = await this.get<Record<string, unknown>>(
      DATA_FABRIC_V3_ENDPOINTS.MEMBER.READ_RECORD(entityName, memberName, recordId),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return response.data;
  }

  @track('EntitiesV3.GetMemberRecordByKey')
  async getMemberRecordByKey(entityName: string, memberName: string, key: string, options?: EntityV3MemberGetRecordOptions): Promise<Record<string, unknown>> {
    const response = await this.get<Record<string, unknown>>(
      DATA_FABRIC_V3_ENDPOINTS.MEMBER.READ_BY_KEY(entityName, memberName, key),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return response.data;
  }

  @track('EntitiesV3.DeleteMemberRecord')
  async deleteMemberRecord(entityName: string, memberName: string, recordId: string, options?: EntityV3DeleteOptions): Promise<EntityV3MemberDeleteResponse> {
    const response = await this.delete<EntityV3MemberDeleteResponse>(
      DATA_FABRIC_V3_ENDPOINTS.MEMBER.DELETE_RECORD(entityName, memberName, recordId),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return response.data;
  }

  @track('EntitiesV3.DeleteMemberRecords')
  async deleteMemberRecords(entityName: string, memberName: string, recordIds: string[], options?: EntityV3DeleteOptions): Promise<EntityV3MemberDeleteResponse> {
    const response = await this.post<EntityV3MemberDeleteResponse>(
      DATA_FABRIC_V3_ENDPOINTS.MEMBER.DELETE(entityName, memberName),
      recordIds,
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return response.data;
  }

  @track('EntitiesV3.CreateMemberField')
  async createMemberField(entityName: string, memberName: string, request: EntityV3FieldCreateRequest, options?: EntityV3SchemaOptions): Promise<string> {
    const response = await this.post<string>(
      DATA_FABRIC_V3_ENDPOINTS.MEMBER.FIELD.CREATE(entityName, memberName),
      request,
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return response.data;
  }

  @track('EntitiesV3.UpdateMemberField')
  async updateMemberField(entityName: string, memberName: string, fieldId: string, request: EntityV3FieldUpdateRequest, options?: EntityV3SchemaOptions): Promise<boolean> {
    const response = await this.patch<boolean>(
      DATA_FABRIC_V3_ENDPOINTS.MEMBER.FIELD.UPDATE(entityName, memberName, fieldId),
      { id: fieldId, ...request },
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return response.data;
  }

  @track('EntitiesV3.DeleteMemberField')
  async deleteMemberField(entityName: string, memberName: string, fieldId: string, options?: EntityV3SchemaOptions): Promise<boolean> {
    const response = await this.delete<boolean>(
      DATA_FABRIC_V3_ENDPOINTS.MEMBER.FIELD.DELETE(entityName, memberName, fieldId),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return response.data;
  }

  @track('EntitiesV3.DeleteMemberFieldHard')
  async deleteMemberFieldHard(entityName: string, memberName: string, fieldId: string, options?: EntityV3SchemaOptions): Promise<boolean> {
    const response = await this.post<boolean>(
      DATA_FABRIC_V3_ENDPOINTS.MEMBER.FIELD.DELETE_HARD(entityName, memberName, fieldId),
      undefined,
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return response.data;
  }

  // ----- Attachments --------------------------------------------------------

  @track('EntitiesV3.DownloadAttachment')
  async downloadAttachment(entityName: string, recordId: string, fieldName: string, options?: EntityV3DownloadAttachmentOptions): Promise<Blob> {
    const response = await this.get<Blob>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.ATTACHMENT.DOWNLOAD(entityName, recordId, fieldName),
      {
        responseType: RESPONSE_TYPES.BLOB,
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
      }
    );
    return response.data;
  }

  @track('EntitiesV3.UploadAttachment')
  async uploadAttachment(entityName: string, recordId: string, fieldName: string, file: EntityFileType, options?: EntityV3UploadAttachmentOptions): Promise<Record<string, unknown>> {
    const formData = new FormData();
    if (file instanceof Uint8Array) {
      formData.append('file', new Blob([file.buffer as ArrayBuffer]));
    } else {
      formData.append('file', file);
    }
    const response = await this.post<Record<string, unknown>>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.ATTACHMENT.UPLOAD(entityName, recordId, fieldName),
      formData,
      {
        params: createParams({ expansionLevel: options?.expansionLevel }),
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
      }
    );
    return response.data;
  }

  @track('EntitiesV3.DeleteAttachment')
  async deleteAttachment(entityName: string, recordId: string, fieldName: string, options?: EntityV3DeleteAttachmentOptions): Promise<Record<string, unknown>> {
    const response = await this.delete<Record<string, unknown>>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.ATTACHMENT.DELETE(entityName, recordId, fieldName),
      {
        params: createParams({ expansionLevel: options?.expansionLevel }),
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
      }
    );
    return response.data;
  }

  // ----- Autopilot ----------------------------------------------------------

  @track('EntitiesV3.ManageWithAutopilot')
  async manageWithAutopilot(request: EntityV3AutopilotRequest): Promise<EntityV3AutopilotResponse> {
    const response = await this.post<EntityV3AutopilotResponse>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.AUTOPILOT.MANAGE,
      request
    );
    return response.data;
  }

  @track('EntitiesV3.ManageWithAutopilotStream')
  async manageWithAutopilotStream(request: EntityV3AutopilotRequest): Promise<ReadableStream<Uint8Array>> {
    const response = await this.post<ReadableStream<Uint8Array>>(
      DATA_FABRIC_V3_ENDPOINTS.ENTITY.AUTOPILOT.MANAGE_STREAM,
      request,
      { responseType: RESPONSE_TYPES.STREAM }
    );
    return response.data;
  }
}
