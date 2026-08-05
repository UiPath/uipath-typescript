import { ValidationError } from '../../core/errors';
import { BaseService } from '../base';
import { EntityServiceModel, EntityGetResponse, createEntityWithMethods } from '../../models/data-fabric/entities.models';
import {
  EntityGetRecordsByIdOptions,
  EntityGetAllRecordsOptions,
  EntityGetRecordByIdOptions,
  EntityInsertOptions,
  EntityInsertRecordOptions,
  EntityBatchInsertOptions,
  EntityInsertRecordsOptions,
  EntityInsertResponse,
  EntityBatchInsertResponse,
  EntityUpdateRecordOptions,
  EntityUpdateRecordResponse,
  EntityUpdateRecordsOptions,
  EntityUpdateResponse,
  EntityDeleteRecordsOptions,
  EntityDeleteResponse,
  EntityRecord,
  RawEntityGetResponse,
  FieldMetaData,
  EntityFileType,
  EntityUploadAttachmentOptions,
  EntityUploadAttachmentResponse,
  EntityDownloadAttachmentOptions,
  EntityDeleteAttachmentOptions,
  EntityDeleteAttachmentResponse,
  EntityQueryRecordsOptions,
  EntityJoin,
  JoinType,
  EntityImportRecordsResponse,
  EntityImportRecordsByIdOptions,
  EntityCreateOptions,
  EntityCreateFieldOptions,
  EntityFieldDataType,
  EntityType,
  EntityGetAllOptions,
  EntityGetByIdOptions,
  EntityDeleteByIdOptions,
  EntityDeleteRecordByIdOptions,
  EntityUpdateByIdOptions,
  SqlType,
  FieldDisplayType,
  ReferenceType,
  EntityClass,
  EntityCreateExternalSource,
  EntityCreateExternalField,
} from '../../models/data-fabric/entities.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination/types';
import { PaginationType } from '../../utils/pagination/internal-types';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { ENTITY_PAGINATION, ENTITY_OFFSET_PARAMS, HTTP_METHODS } from '../../utils/constants/common';
import { DATA_FABRIC_ENDPOINTS, DATA_FABRIC_TENANT_FOLDER_ID } from '../../utils/constants/endpoints/data-fabric';
import { FOLDER_KEY, RESPONSE_TYPES } from '../../utils/constants/headers';
import { createHeaders } from '../../utils/http/headers';
import { createParams } from '../../utils/http/params';
import { transformData } from '../../utils/transform';
import {
  EntityFieldTypeMap,
  EntityMap,
  EntitySchemaFieldTypeMap,
  FieldDisplayTypeToDataType,
  ENTITY_FIELD_CONSTRAINT_DEFAULTS,
  ENTITY_FIELD_CONSTRAINT_SPEC,
  ENTITY_TYPE_IDS,
  MAX_QUERY_JOINS,
  EntityClassToIdMap,
} from '../../models/data-fabric/entities.constants';
import { FieldSchemaPayload, SqlFieldType, EntityFieldConstraint, ResolvedReferenceMeta, EntityJoinPayload, FederatedUpsertParts, FederatedUpdateDeltas } from '../../models/data-fabric/entities.internal-types';
import { track } from '../../core/telemetry';

/** Wire values for join types on the name-based multi-entity query route. */
const JOIN_TYPE_WIRE: Record<JoinType, EntityJoinPayload['type']> = {
  [JoinType.LeftJoin]: 'LEFT',
  [JoinType.InnerJoin]: 'INNER',
};

/** Qualify `field` with `entityName` unless the caller already qualified it. */
const qualifyJoinField = (entityName: string, field: string): string =>
  field.includes('.') ? field : `${entityName}.${field}`;

/**
 * Translate the public {@link EntityJoin} shape to the multi-entity query wire
 * contract ({@link EntityJoinPayload}) with entity-qualified join keys.
 */
function toWireJoin(join: EntityJoin, baseEntityName: string): EntityJoinPayload {
  return {
    type: JOIN_TYPE_WIRE[join.joinType ?? JoinType.LeftJoin],
    entity: join.relatedEntityName,
    on: {
      left: qualifyJoinField(join.entityName ?? baseEntityName, join.joinFieldName),
      right: qualifyJoinField(join.relatedEntityName, join.relatedFieldName),
    },
  };
}

/** Name of the external object a Federated source reads from (wire shape). */
function externalSourceObjectName(source: Record<string, unknown>): string | undefined {
  return (source.externalObjectDetail as Record<string, unknown> | undefined)?.externalObjectName as string | undefined;
}

/** Internal column name of a Federated source field (wire shape uses `fieldDefinition`). */
function externalSourceFieldName(field: Record<string, unknown>): string | undefined {
  const def = field.fieldDefinition as Record<string, unknown> | undefined;
  return (def?.name ?? def?.Name) as string | undefined;
}

/**
 * Carries an existing source forward for the upsert. The only reshaping the write needs
 * is defaulting `fieldDisplayType`/`description` on each field definition: the GET omits
 * them, but the upsert requires `fieldDisplayType` (a missing one fails the source's field
 * validation and surfaces as a misleading join-dependency error). Server-managed identity
 * fields round-trip harmlessly, so everything else is kept as-is.
 */
function carryForwardSource(source: Record<string, unknown>): Record<string, unknown> {
  const fields = ((source.fields as Array<Record<string, unknown>> | undefined) ?? []).map(f => {
    const fieldDefinition: Record<string, unknown> = { ...(f.fieldDefinition as Record<string, unknown> | undefined) };
    if (fieldDefinition.fieldDisplayType === undefined && fieldDefinition.FieldDisplayType === undefined) {
      fieldDefinition.fieldDisplayType = FieldDisplayType.Basic;
    }
    if (fieldDefinition.description === undefined && fieldDefinition.Description === undefined) {
      fieldDefinition.description = '';
    }
    return { ...f, fieldDefinition };
  });
  return { ...source, fields };
}

/**
 * Service for interacting with the Data Fabric Entity API
 */
export class EntityService extends BaseService implements EntityServiceModel {
  @track('Entities.GetById')
  async getById(id: string, options?: EntityGetByIdOptions): Promise<EntityGetResponse> {
    // Get entity metadata
    const response = await this.get<RawEntityGetResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.GET_BY_ID(id),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );

    // Apply EntityMap transformations
    const metadata = transformData(response.data as RawEntityGetResponse, EntityMap)

    // Transform metadata with field mappers
    this.applyFieldMappings(metadata);

    // Return the entity metadata with methods attached
    return createEntityWithMethods(metadata, this);
  }

  @track('Entities.GetAllRecords')
  async getAllRecords<T extends EntityGetAllRecordsOptions = EntityGetAllRecordsOptions>(
    entityId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<EntityRecord>
      : NonPaginatedResponse<EntityRecord>
  > {
    // folderKey is header-only — destructure it out so PaginationHelpers doesn't serialise it
    // into the query string as $folderKey.
    const { folderKey, ...rest } = options ?? {};
    const downstreamOptions = options === undefined ? undefined : (rest as T);
    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => DATA_FABRIC_ENDPOINTS.ENTITY.GET_ENTITY_RECORDS(entityId),
      headers: createHeaders({ [FOLDER_KEY]: folderKey }),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: ENTITY_PAGINATION.ITEMS_FIELD,
        totalCountField: ENTITY_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ENTITY_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: ENTITY_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: ENTITY_OFFSET_PARAMS.COUNT_PARAM
        }
      },
      excludeFromPrefix: ['expansionLevel'] // Don't add ODATA prefix to expansionLevel
    }, downstreamOptions);
  }

  @track('Entities.GetRecordById')
  async getRecordById(
    entityId: string,
    recordId: string,
    options: EntityGetRecordByIdOptions = {}
  ): Promise<EntityRecord> {
    const params = createParams({
      expansionLevel: options.expansionLevel
    });

    const response = await this.get<EntityRecord>(
      DATA_FABRIC_ENDPOINTS.ENTITY.GET_RECORD_BY_ID(entityId, recordId),
      { params, headers: createHeaders({ [FOLDER_KEY]: options.folderKey }) }
    );

    return response.data;
  }

  @track('Entities.InsertRecordById')
  async insertRecordById(id: string, data: Record<string, any>, options: EntityInsertRecordOptions = {}): Promise<EntityInsertResponse> {
    const params = createParams({
      expansionLevel: options.expansionLevel
    });

    const response = await this.post<EntityInsertResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.INSERT_BY_ID(id),
      data,
      {
        params,
        headers: createHeaders({ [FOLDER_KEY]: options.folderKey }),
      }
    );

    return response.data;
  }

  @track('Entities.InsertRecordsById')
  async insertRecordsById(id: string, data: Record<string, any>[], options: EntityInsertRecordsOptions = {}): Promise<EntityBatchInsertResponse> {
    const params = createParams({
      expansionLevel: options.expansionLevel,
      failOnFirst: options.failOnFirst
    });

    const response = await this.post<EntityBatchInsertResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.BATCH_INSERT_BY_ID(id),
      data,
      {
        params,
        headers: createHeaders({ [FOLDER_KEY]: options.folderKey }),
      }
    );

    return response.data;
  }

  @track('Entities.UpdateRecordById')
  async updateRecordById(entityId: string, recordId: string, data: Record<string, any>, options: EntityUpdateRecordOptions = {}): Promise<EntityUpdateRecordResponse> {
    const params = createParams({
      expansionLevel: options.expansionLevel
    });

    const response = await this.post<EntityUpdateRecordResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.UPDATE_RECORD_BY_ID(entityId, recordId),
      data,
      {
        params,
        headers: createHeaders({ [FOLDER_KEY]: options.folderKey }),
      }
    );

    return response.data;
  }

  @track('Entities.UpdateRecordsById')
  async updateRecordsById(id: string, data: EntityRecord[], options: EntityUpdateRecordsOptions = {}): Promise<EntityUpdateResponse> {
    const params = createParams({
      expansionLevel: options.expansionLevel,
      failOnFirst: options.failOnFirst
    });

    const response = await this.post<EntityUpdateResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.UPDATE_BY_ID(id),
      data,
      {
        params,
        headers: createHeaders({ [FOLDER_KEY]: options.folderKey }),
      }
    );

    return response.data;
  }

  @track('Entities.DeleteRecordsById')
  async deleteRecordsById(id: string, recordIds: string[], options: EntityDeleteRecordsOptions = {}): Promise<EntityDeleteResponse> {
    const params = createParams({
      failOnFirst: options.failOnFirst
    });

    const response = await this.post<EntityDeleteResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.DELETE_BY_ID(id),
      recordIds,
      {
        params,
        headers: createHeaders({ [FOLDER_KEY]: options.folderKey }),
      }
    );

    return response.data;
  }

  @track('Entities.DeleteRecordById')
  async deleteRecordById(entityId: string, recordId: string, options?: EntityDeleteRecordByIdOptions): Promise<void> {
    await this.delete(
      DATA_FABRIC_ENDPOINTS.ENTITY.DELETE_RECORD_BY_ID(entityId, recordId),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) },
    );
  }

  @track('Entities.GetAll')
  async getAll(options?: EntityGetAllOptions): Promise<EntityGetResponse[]> {
    // Use the v3 endpoint whenever a folder scope is requested: a folderKey scopes to that
    // folder via the header, and includeFolderEntities returns tenant + folder entities
    // together. Only the default (no folderKey and includeFolderEntities omitted) stays on
    // the v1 endpoint = tenant only, since v3 has no tenant-only listing.
    const endpoint = options?.folderKey || options?.includeFolderEntities
      ? DATA_FABRIC_ENDPOINTS.ENTITY.GET_ALL_V3
      : DATA_FABRIC_ENDPOINTS.ENTITY.GET_ALL;

    const response = await this.get<RawEntityGetResponse[]>(
      endpoint,
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    
    // Apply transformations
    const entities = response.data.map(entity => {
      // Transform each entity
      const metadata = transformData(entity as RawEntityGetResponse, EntityMap);
      this.applyFieldMappings(metadata);
      // Attach entity methods
      return createEntityWithMethods(metadata, this);
    });
    
    return entities;
  }

  @track('Entities.QueryRecordsById')
  async queryRecordsById<T extends EntityQueryRecordsOptions = EntityQueryRecordsOptions>(
    id: string,
    options?: T
  ): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<EntityRecord> : NonPaginatedResponse<EntityRecord>> {
    if (options?.joins && options.joins.length > MAX_QUERY_JOINS) {
      throw new ValidationError({
        message: `A maximum of ${MAX_QUERY_JOINS} joins is supported per query (received ${options.joins.length})`,
      });
    }
    // The multi-entity query API rejects join queries without a projection;
    // surface that requirement client-side with an actionable message.
    if (options?.joins && options.joins.length > 0 && !options.selectedFields?.length && !options.aggregates?.length) {
      throw new ValidationError({
        message: 'Join queries require selectedFields or aggregates — reference fields as "<EntityName>.<FieldName>" (e.g. "Customer.name")',
      });
    }
    // folderKey is header-only; expansionLevel must be sent as a query param by PaginationHelpers.
    const { folderKey, expansionLevel, ...rest } = options ?? {};
    // The multi-entity (joins) contract only exists on the name-based query route —
    // the ID-based route silently drops the `joins` body key. Resolve the entity name
    // and translate each join to the wire shape ({ type, entity, on: { left, right } }).
    let getEndpoint = () => DATA_FABRIC_ENDPOINTS.ENTITY.QUERY_BY_ID(id);
    if (options?.joins && options.joins.length > 0) {
      const baseEntityName = await this.resolveEntityName(id, folderKey);
      (rest as Record<string, unknown>).joins = options.joins.map(join => toWireJoin(join, baseEntityName));
      getEndpoint = () => DATA_FABRIC_ENDPOINTS.ENTITY.QUERY_BY_NAME(baseEntityName);
    }
    const downstreamOptions = options === undefined ? undefined : (rest as T);
    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint,
      method: HTTP_METHODS.POST,
      headers: createHeaders({ [FOLDER_KEY]: folderKey }),
      queryParams: createParams({ expansionLevel }),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: ENTITY_PAGINATION.ITEMS_FIELD,
        totalCountField: ENTITY_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ENTITY_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: ENTITY_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: ENTITY_OFFSET_PARAMS.COUNT_PARAM
        }
      },
      excludeFromPrefix: ['filterGroup', 'selectedFields', 'sortOptions', 'aggregates', 'groupBy', 'joins']
    }, downstreamOptions);
  }

  @track('Entities.ImportRecordsById')
  async importRecordsById(id: string, file: EntityFileType, options?: EntityImportRecordsByIdOptions): Promise<EntityImportRecordsResponse> {
    const formData = new FormData();
    if (file instanceof Uint8Array) {
      formData.append('file', new Blob([file.buffer as ArrayBuffer]));
    } else {
      formData.append('file', file);
    }

    const response = await this.post<EntityImportRecordsResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.BULK_UPLOAD_BY_ID(id),
      formData,
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) },
    );

    return response.data;
  }

  @track('Entities.DownloadAttachment')
  async downloadAttachment(entityId: string, recordId: string, fieldName: string, options?: EntityDownloadAttachmentOptions): Promise<Blob> {
    const response = await this.get<Blob>(
      DATA_FABRIC_ENDPOINTS.ENTITY.DOWNLOAD_ATTACHMENT(entityId, recordId, fieldName),
      {
        responseType: RESPONSE_TYPES.BLOB,
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
      }
    );

    return response.data;
  }

  @track('Entities.UploadAttachment')
  async uploadAttachment(entityId: string, recordId: string, fieldName: string, file: EntityFileType, options?: EntityUploadAttachmentOptions): Promise<EntityUploadAttachmentResponse> {
    const formData = new FormData();
    if (file instanceof Uint8Array) {
      formData.append('file', new Blob([file.buffer as ArrayBuffer]));
    } else {
      formData.append('file', file);
    }

    const params = createParams({ expansionLevel: options?.expansionLevel });

    const response = await this.post<EntityUploadAttachmentResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.UPLOAD_ATTACHMENT(entityId, recordId, fieldName),
      formData,
      {
        params,
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
      }
    );

    return response.data;
  }

  @track('Entities.DeleteAttachment')
  async deleteAttachment(entityId: string, recordId: string, fieldName: string, options?: EntityDeleteAttachmentOptions): Promise<EntityDeleteAttachmentResponse> {
    const response = await this.delete<EntityDeleteAttachmentResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.DELETE_ATTACHMENT(entityId, recordId, fieldName),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) },
    );

    return response.data;
  }

  async getRecordsById<T extends EntityGetRecordsByIdOptions = EntityGetRecordsByIdOptions>(
    entityId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<EntityRecord>
      : NonPaginatedResponse<EntityRecord>
  > {
    return this.getAllRecords(entityId, options);
  }

  async insertById(id: string, data: Record<string, any>, options: EntityInsertOptions = {}): Promise<EntityInsertResponse> {
    return this.insertRecordById(id, data, options);
  }

  async batchInsertById(id: string, data: Record<string, any>[], options: EntityBatchInsertOptions = {}): Promise<EntityBatchInsertResponse> {
    return this.insertRecordsById(id, data, options);
  }

  @track('Entities.Create')
  async create(name: string, fields: EntityCreateFieldOptions[], options?: EntityCreateOptions): Promise<string> {
    const opts = options ?? {};
    // entityClassId is only sent when a class is explicitly chosen — native creates
    // stay byte-identical to the legacy shape (no discriminator).
    let entityClassId: number | undefined;
    if (opts.entityClass !== undefined) {
      entityClassId = EntityClassToIdMap[opts.entityClass];
      if (entityClassId === undefined) {
        throw new ValidationError({
          message: `entityClass '${opts.entityClass}' is not creatable. Use EntityClass.Native or EntityClass.Federated.`,
        });
      }
    }
    if (opts.entityClass === EntityClass.Federated && !opts.externalFields?.length) {
      throw new ValidationError({
        message: 'Federated entities require at least one external source in `externalFields`.',
      });
    }
    const fieldPayloads = await this.buildFieldsWithReferenceMeta(fields);
    const externalFields = await this.buildExternalSourcesPayload(opts.externalFields);
    const payload = {
      ...(opts.description !== undefined && { description: opts.description }),
      displayName: opts.displayName ?? name,
      entityDefinition: {
        name,
        fields: fieldPayloads,
        folderId: opts.folderKey ?? DATA_FABRIC_TENANT_FOLDER_ID,
        isRbacEnabled: opts.isRbacEnabled ?? false,
        isInsightsEnabled: opts.isAnalyticsEnabled ?? false,
        externalFields,
        ...(entityClassId !== undefined && { entityClassId }),
        ...(opts.sourceJoinConditionDetails !== undefined && { sourceJoinConditionDetails: opts.sourceJoinConditionDetails }),
      },
    };
    const response = await this.post<string>(
      DATA_FABRIC_ENDPOINTS.ENTITY.UPSERT,
      payload,
      { headers: createHeaders({ [FOLDER_KEY]: opts.folderKey }) },
    );
    return response.data;
  }

  @track('Entities.DeleteById')
  async deleteById(id: string, options?: EntityDeleteByIdOptions): Promise<void> {
    await this.delete(
      DATA_FABRIC_ENDPOINTS.ENTITY.DELETE(id),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) },
    );
  }

  @track('Entities.UpdateById')
  async updateById(id: string, options?: EntityUpdateByIdOptions): Promise<void> {
    const opts = options ?? {};
    const hasFederatedChanges = !!(
      opts.addExternalSources?.length ||
      opts.removeExternalSources?.length ||
      opts.addFieldsToSource?.length ||
      opts.removeFieldsFromSource?.length ||
      opts.updateExternalFieldMapping?.length ||
      opts.addSourceJoins?.length ||
      opts.updateSourceJoin?.length
    );
    const hasSchemaChanges = !!(opts.addFields?.length || opts.removeFields?.length || opts.updateFields?.length) || hasFederatedChanges;
    const hasMetadataChanges = opts.displayName !== undefined || opts.description !== undefined || opts.isRbacEnabled !== undefined || opts.isAnalyticsEnabled !== undefined;

    if (hasSchemaChanges) {
      await this.applySchemaUpdate(id, opts);
    }
    if (hasMetadataChanges) {
      await this.patch(
        DATA_FABRIC_ENDPOINTS.ENTITY.UPDATE_METADATA(id),
        {
          ...(opts.displayName !== undefined && { displayName: opts.displayName }),
          ...(opts.description !== undefined && { description: opts.description }),
          ...(opts.isRbacEnabled !== undefined && { isRbacEnabled: opts.isRbacEnabled }),
          ...(opts.isAnalyticsEnabled !== undefined && { isInsightsEnabled: opts.isAnalyticsEnabled }),
        },
        { headers: createHeaders({ [FOLDER_KEY]: opts.folderKey }) },
      );
    }
  }

  /**
   * Fetches the current entity schema, applies the field delta, then posts the full updated schema.
   *
   * @param entityId - UUID of the entity to update
   * @param options - Field changes to apply
   * @private
   */
  private async applySchemaUpdate(entityId: string, options: Pick<EntityUpdateByIdOptions, 'addFields' | 'removeFields' | 'updateFields' | 'folderKey'> & FederatedUpdateDeltas): Promise<void> {
    const folderHeaders = createHeaders({ [FOLDER_KEY]: options.folderKey });
    const entityResponse = await this.get<RawEntityGetResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.GET_BY_ID(entityId),
      { headers: folderHeaders },
    );
    const raw = entityResponse.data;

    // Carry forward existing non-system fields from GET response (skip system/primary-key
    // fields). Exclude external fields: on a Federated entity the GET flattens the external
    // source fields into `fields` too (isExternalField=true); they belong only under
    // `externalFields`, so reposting them here duplicates them and the upsert fails.
    let fields: FieldMetaData[] = (raw.fields ?? [])
      .filter(f => !f.isSystemField && !f.isPrimaryKey && !f.isExternalField);

    // Filter out removed fields
    if (options.removeFields?.length) {
      const removeSet = new Set(options.removeFields.map(r => r.name));
      fields = fields.filter(f => !removeSet.has(f.name));
    }

    // Apply per-field metadata updates (matched by field ID)
    if (options.updateFields?.length) {
      const updateMap = new Map(options.updateFields.map(u => [u.id, u]));
      fields = fields.map(f => {
        const update = updateMap.get(f.id ?? '');
        if (!update) return f;
        const constraintUpdate = {
          ...(update.lengthLimit !== undefined && { lengthLimit: update.lengthLimit }),
          ...(update.maxValue !== undefined && { maxValue: update.maxValue }),
          ...(update.minValue !== undefined && { minValue: update.minValue }),
          ...(update.decimalPrecision !== undefined && { decimalPrecision: update.decimalPrecision }),
        };
        const hasConstraintUpdate = Object.keys(constraintUpdate).length > 0;
        if (hasConstraintUpdate) {
          if (!f.sqlType) {
            throw new ValidationError({
              message: `Cannot update constraints on field '${f.name}' (id: ${f.id}) — the field is missing sqlType metadata in the entity definition.`,
            });
          }
          this.validateFieldConstraints(this.resolveFieldDataType(f), update, f.name);
        }
        return {
          ...f,
          ...(update.displayName !== undefined && { displayName: update.displayName }),
          ...(update.description !== undefined && { description: update.description }),
          ...(update.isRequired !== undefined && { isRequired: update.isRequired }),
          ...(update.isUnique !== undefined && { isUnique: update.isUnique }),
          ...(update.isRbacEnabled !== undefined && { isRbacEnabled: update.isRbacEnabled }),
          ...(update.isEncrypted !== undefined && { isEncrypted: update.isEncrypted }),
          ...(update.isHiddenField !== undefined && { isHiddenField: update.isHiddenField }),
          ...(update.defaultValue !== undefined && { defaultValue: update.defaultValue }),
          ...(hasConstraintUpdate && f.sqlType && { sqlType: { ...f.sqlType, ...constraintUpdate } }),
        };
      });
    }

    const newFields: FieldSchemaPayload[] = [];
    if (options.addFields?.length) {
      newFields.push(...await this.buildFieldsWithReferenceMeta(options.addFields));
    }

    // Carry forward (and, for Federated entities, translate + apply deltas to) the
    // external sources and joins. Reposting the raw `externalFields` alone would drop
    // the joins and class discriminator — the v3 upsert is a full-definition replace.
    const federated = await this.buildFederatedUpsertParts(raw, options);

    await this.post(
      DATA_FABRIC_ENDPOINTS.ENTITY.UPSERT,
      {
        displayName: raw.displayName,
        description: raw.description,
        entityDefinition: {
          id: entityId,
          name: raw.name,
          fields: [...fields, ...newFields],
          folderId: raw.folderId ?? DATA_FABRIC_TENANT_FOLDER_ID,
          isRbacEnabled: raw.isRbacEnabled ?? false,
          // `raw` is the untransformed GET response, so read the wire key `isInsightsEnabled`
          // directly (it is not on the public type, which exposes it as `isAnalyticsEnabled`).
          isInsightsEnabled: (raw as { isInsightsEnabled?: boolean }).isInsightsEnabled ?? false,
          externalFields: federated.externalFields,
          ...(federated.entityClassId !== undefined && { entityClassId: federated.entityClassId }),
          ...(federated.sourceJoinConditionDetails !== undefined && { sourceJoinConditionDetails: federated.sourceJoinConditionDetails }),
        },
      },
      { headers: folderHeaders },
    );
  }

  /**
   * Resolves an entity's name from its ID. Untracked internal helper — calling
   * the public `getById` from another `@track`-decorated method would emit
   * double telemetry (see conventions.md, delegation anti-pattern).
   *
   * @param id - Entity ID to resolve
   * @param folderKey - Optional folder key sent as the X-UIPATH-FolderKey header
   * @private
   */
  private async resolveEntityName(id: string, folderKey?: string): Promise<string> {
    const response = await this.get<RawEntityGetResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.GET_BY_ID(id),
      { headers: createHeaders({ [FOLDER_KEY]: folderKey }) }
    );
    return transformData(response.data, EntityMap).name;
  }

  /**
   * Translates a raw GET into the write-ready Federated parts, then applies any
   * source/join deltas. Joins arrive as `sourceJoinCriterias` (object/field IDs) and
   * are resolved to `sourceJoinConditionDetails` (object names + connection ids) using
   * each source's `externalObjectDetail.id` → connection map. `joinType` passes through
   * as-is (the API accepts both the string form and the numeric form).
   */
  private async buildFederatedUpsertParts(
    raw: RawEntityGetResponse,
    options: FederatedUpdateDeltas,
  ): Promise<FederatedUpsertParts> {
    // Carry forward current sources (only `fieldDisplayType`/`description` need defaulting).
    let externalFields: Array<Record<string, unknown>> = (raw.externalFields ?? []).map(s => carryForwardSource({ ...s } as Record<string, unknown>));
    let joins = this.translateSourceJoins(raw);
    const entityClassId = raw.entityClass ? EntityClassToIdMap[raw.entityClass] : undefined;

    const findSource = (name: string): Record<string, unknown> | undefined =>
      externalFields.find(s => externalSourceObjectName(s) === name);

    if (options.addExternalSources?.length) {
      externalFields.push(...await this.buildExternalSourcesPayload(options.addExternalSources));
    }
    if (options.removeExternalSources?.length) {
      const remove = new Set(options.removeExternalSources);
      externalFields = externalFields.filter(s => !remove.has(externalSourceObjectName(s) ?? ''));
      // Cascade: a join can't outlive its source. Drop any join that references a removed
      // source — otherwise it dangles (and, once the source is gone, can't be targeted by
      // name to remove later). Join names were resolved from the pre-removal GET.
      joins = joins.filter(j => !remove.has(j.sourceObjectName as string) && !remove.has(j.relatedSourceObjectName as string));
    }
    if (options.addFieldsToSource?.length) {
      for (const add of options.addFieldsToSource) {
        const src = findSource(add.sourceObjectName);
        if (!src) throw new ValidationError({ message: `Cannot add fields: source '${add.sourceObjectName}' not found on the entity.` });
        const builtFields = await this.buildExternalFieldsPayload(add.fields);
        const existing = (src.fields as Array<Record<string, unknown>> | undefined) ?? [];
        src.fields = [...existing, ...builtFields];
      }
    }
    if (options.removeFieldsFromSource?.length) {
      for (const rem of options.removeFieldsFromSource) {
        const src = findSource(rem.sourceObjectName);
        if (!src) throw new ValidationError({ message: `Cannot remove fields: source '${rem.sourceObjectName}' not found on the entity.` });
        const drop = new Set(rem.fieldNames);
        src.fields = ((src.fields as Array<Record<string, unknown>> | undefined) ?? []).filter(f => !drop.has(externalSourceFieldName(f) ?? ''));
      }
    }
    if (options.updateExternalFieldMapping?.length) {
      for (const up of options.updateExternalFieldMapping) {
        const src = findSource(up.sourceObjectName);
        if (!src) throw new ValidationError({ message: `Cannot update mapping: source '${up.sourceObjectName}' not found on the entity.` });
        const field = ((src.fields as Array<Record<string, unknown>> | undefined) ?? []).find(f => externalSourceFieldName(f) === up.fieldName);
        if (!field) throw new ValidationError({ message: `Cannot update mapping: field '${up.fieldName}' not found on source '${up.sourceObjectName}'.` });
        field.externalFieldMappingDetail = { ...(field.externalFieldMappingDetail as Record<string, unknown>), ...up.mapping };
      }
    }
    if (options.addSourceJoins?.length) {
      joins.push(...options.addSourceJoins.map(j => ({ ...j } as Record<string, unknown>)));
    }
    if (options.updateSourceJoin?.length) {
      for (const up of options.updateSourceJoin) {
        const join = joins.find(j => j.sourceObjectName === up.sourceObjectName && j.relatedSourceObjectName === up.relatedSourceObjectName);
        if (!join) throw new ValidationError({ message: `Cannot update join: no join between '${up.sourceObjectName}' and '${up.relatedSourceObjectName}'.` });
        if (up.sourceJoinField !== undefined) join.sourceJoinField = up.sourceJoinField;
        if (up.relatedSourceJoinField !== undefined) join.relatedSourceJoinField = up.relatedSourceJoinField;
        if (up.joinType !== undefined) join.joinType = up.joinType;
      }
    }

    return {
      externalFields,
      ...(entityClassId !== undefined && { entityClassId }),
      ...(joins.length > 0 && { sourceJoinConditionDetails: joins }),
    };
  }

  /**
   * Resolves read-shape `sourceJoinCriterias` (object/field IDs) into write-shape
   * `sourceJoinConditionDetails` (object names + connection ids). The connection id for a
   * source is its `externalConnectionDetail.connectionId` (external) or
   * `nativeConnectionDetail.entityId` (a Native source referencing another UiPath entity).
   */
  private translateSourceJoins(raw: RawEntityGetResponse): Array<Record<string, unknown>> {
    const byObjectId = new Map<string, { name?: string; connectionId?: string }>();
    for (const source of raw.externalFields ?? []) {
      const objectId = source.externalObjectDetail?.id;
      if (!objectId) continue;
      byObjectId.set(objectId, {
        name: source.externalObjectDetail?.externalObjectName,
        connectionId: source.externalConnectionDetail?.connectionId ?? source.nativeConnectionDetail?.entityId,
      });
    }
    return (raw.sourceJoinCriterias ?? []).map(join => {
      const src = byObjectId.get(join.sourceObjectId ?? '');
      const related = byObjectId.get(join.relatedSourceObjectId ?? '');
      return {
        sourceObjectName: src?.name,
        sourceJoinField: join.joinFieldName,
        sourceObjectConnectionId: src?.connectionId,
        joinType: join.joinType,
        relatedSourceObjectName: related?.name,
        relatedSourceJoinField: join.relatedSourceFieldName,
        relatedSourceObjectConnectionId: related?.connectionId,
      };
    });
  }

  /**
   * Orchestrates all field mapping transformations
   *
   * @param metadata - Entity metadata to transform
   * @private
   */
  private applyFieldMappings(metadata: RawEntityGetResponse): void {
    this.mapFieldTypes(metadata);
    this.mapExternalFields(metadata);
  }

  /**
   * Maps SQL field types to friendly EntityFieldTypes
   * 
   * @param metadata - Entity metadata with fields
   * @private
   */
  private mapFieldTypes(metadata: RawEntityGetResponse): void {
    if (!metadata.fields?.length) return;

    metadata.fields = metadata.fields.map(field => {
      // Rename sqlType to fieldDataType
      let transformedField = transformData(field, EntityMap);

      // Map field type: prefer fieldDisplayType for types that share SQL types (File, ChoiceSet, AutoNumber)
      if (transformedField.fieldDataType?.name) {
        const mapped = this.tryResolveFieldDataType(transformedField.fieldDisplayType, field.sqlType?.name);
        if (mapped) {
          transformedField.fieldDataType.name = mapped;
        }
      }

      this.transformNestedReferences(transformedField);

      return transformedField;
    });
  }

  /**
   * Resolves an {@link EntityFieldDataType} from a field's `fieldDisplayType` and
   * raw SQL type name. Prefers `fieldDisplayType` to disambiguate types that
   * share a SQL type (FILE, CHOICE_SET_*, AUTO_NUMBER, RELATIONSHIP); falls back
   * to the SQL-type-name mapping. Returns `undefined` if neither resolves.
   */
  private tryResolveFieldDataType(
    fieldDisplayType: FieldDisplayType | undefined,
    sqlTypeName: string | undefined,
  ): EntityFieldDataType | undefined {
    const displayMapped = fieldDisplayType ? FieldDisplayTypeToDataType[fieldDisplayType] : undefined;
    if (displayMapped) return displayMapped;
    return sqlTypeName ? EntityFieldTypeMap[sqlTypeName as SqlFieldType] : undefined;
  }

  /**
   * Transforms nested reference objects in field metadata
   */
  private transformNestedReferences(field: FieldMetaData): void {
    if (field.referenceEntity) {
      field.referenceEntity = transformData(field.referenceEntity, EntityMap);
    }
    if (field.referenceChoiceSet) {
      field.referenceChoiceSet = transformData(field.referenceChoiceSet, EntityMap);
    }
    if (field.referenceField?.definition) {
      field.referenceField.definition = transformData(field.referenceField.definition, EntityMap);
    }
  }

  /**
   * Maps external field names to consistent naming
   *
   * @param metadata - Entity metadata with externalFields
   * @private
   */
  private mapExternalFields(metadata: RawEntityGetResponse): void {
    if (!metadata.externalFields?.length) return;

    metadata.externalFields = metadata.externalFields.map(externalSource => {
      if (externalSource.fields?.length) {
        externalSource.fields = externalSource.fields.map(field => {
          const transformedField = transformData(field, EntityMap);
          if (transformedField.fieldMetaData) {
            transformedField.fieldMetaData = transformData(transformedField.fieldMetaData, EntityMap);
            this.transformNestedReferences(transformedField.fieldMetaData);
          }
          return transformedField;
        });
      }
      return externalSource;
    });
  }

  private async buildFieldsWithReferenceMeta(fields: EntityCreateFieldOptions[]): Promise<FieldSchemaPayload[]> {
    const metas = await Promise.all(fields.map(f => this.buildReferenceMeta(f)));
    return fields.map((f, i) => this.buildSchemaFieldPayload(f, metas[i]));
  }

  /** Builds the wire `fields` payload for a Federated source (field definition + mapping). */
  private async buildExternalFieldsPayload(
    fields?: EntityCreateExternalField[],
  ): Promise<Array<Record<string, unknown>>> {
    const list = fields ?? [];
    const fieldDefs = await this.buildFieldsWithReferenceMeta(list.map(f => f.field));
    return list.map((f, i) => ({
      fieldDefinition: fieldDefs[i],
      externalFieldMappingDetail: f.externalFieldMappingDetail,
    }));
  }

  /**
   * Builds the wire `externalFields` payload for a Federated entity. Each source's
   * internal columns run through the same {@link buildFieldsWithReferenceMeta} pipeline
   * as native fields (so `fieldDefinition` is identical to a native field), then pair
   * with their external mapping and source connection/object details.
   */
  private async buildExternalSourcesPayload(
    sources?: EntityCreateExternalSource[],
  ): Promise<Array<Record<string, unknown>>> {
    if (!sources?.length) return [];
    return Promise.all(sources.map(async source => ({
      fields: await this.buildExternalFieldsPayload(source.fields),
      externalObjectDetail: source.externalObjectDetail,
      ...(source.externalConnectionDetail !== undefined && { externalConnectionDetail: source.externalConnectionDetail }),
      ...(source.nativeConnectionDetail !== undefined && { nativeConnectionDetail: source.nativeConnectionDetail }),
    })));
  }

  // Choice-set targets resolve server-side by NAME (the API rejects cross-folder
  // refs with empty target name even when folderId is supplied), so the SDK
  // fetches the name once for each cross-folder choice-set field. Relationship
  // targets resolve by folderId — no lookup needed.
  private async buildReferenceMeta(field: EntityCreateFieldOptions): Promise<ResolvedReferenceMeta | undefined> {
    if (field.referenceFolderKey === undefined) return undefined;
    if (field.referenceEntityId === undefined && field.choiceSetId === undefined) return undefined;

    const folderId = field.referenceFolderKey;
    const meta: ResolvedReferenceMeta = {};

    if (field.referenceEntityId !== undefined) {
      meta.referenceEntity = { id: field.referenceEntityId, folderId };
    }
    if (field.choiceSetId !== undefined) {
      const lookupFolderKey = folderId === DATA_FABRIC_TENANT_FOLDER_ID ? undefined : folderId;
      const target = await this.get<RawEntityGetResponse>(
        DATA_FABRIC_ENDPOINTS.ENTITY.GET_BY_ID(field.choiceSetId),
        { headers: createHeaders({ [FOLDER_KEY]: lookupFolderKey }) },
      );
      meta.referenceChoiceSet = {
        id: field.choiceSetId,
        name: target.data.name,
        folderId,
        entityType: EntityType.ChoiceSet,
        entityTypeId: ENTITY_TYPE_IDS[EntityType.ChoiceSet],
      };
    }
    return meta;
  }

  /** Converts a user-facing EntityCreateFieldOptions to the raw API field payload */
  private buildSchemaFieldPayload(
    field: EntityCreateFieldOptions,
    refMeta?: ResolvedReferenceMeta,
  ): FieldSchemaPayload {
    const fieldType = field.type ?? EntityFieldDataType.STRING;
    this.validateFieldConstraints(fieldType, field, field.name);
    const isRelationship = fieldType === EntityFieldDataType.RELATIONSHIP;
    const isFile = fieldType === EntityFieldDataType.FILE;
    if (isRelationship && (!field.referenceEntityId || !field.referenceFieldId)) {
      throw new ValidationError({
        message: `Field '${field.name}' of type ${fieldType} requires both referenceEntityId and referenceFieldId (UUIDs of the target entity and field).`,
      });
    }
    const mapping = EntitySchemaFieldTypeMap[fieldType];
    // Prefer the resolved {id, name, folderId} body so cross-folder targets resolve
    // server-side; fall back to a bare {id} when no meta was fetched.
    const referenceEntityBody = refMeta?.referenceEntity ?? (field.referenceEntityId === undefined ? undefined : { id: field.referenceEntityId });
    const referenceChoiceSetBody = refMeta?.referenceChoiceSet;
    return {
      name: field.name,
      displayName: field.displayName ?? field.name,
      sqlType: {
        name: mapping.sqlTypeName,
        ...this.buildSqlTypeConstraints(fieldType, field),
      },
      fieldDisplayType: mapping.fieldDisplayType,
      description: field.description ?? '',
      isRequired: field.isRequired ?? false,
      isUnique: field.isUnique ?? false,
      isRbacEnabled: field.isRbacEnabled ?? false,
      isEncrypted: field.isEncrypted ?? false,
      isHiddenField: field.isHiddenField ?? false,
      ...(field.defaultValue !== undefined && { defaultValue: field.defaultValue }),
      ...(field.choiceSetId !== undefined && { choiceSetId: field.choiceSetId }),
      ...(isRelationship && { isForeignKey: true, referenceType: ReferenceType.ManyToOne }),
      ...(!isFile && referenceEntityBody !== undefined && { referenceEntity: referenceEntityBody }),
      ...(referenceChoiceSetBody !== undefined && { referenceChoiceSet: referenceChoiceSetBody }),
      ...(!isFile && field.referenceFieldId !== undefined && { referenceField: { id: field.referenceFieldId } }),
    };
  }

  /**
   * Derives the user-facing {@link EntityFieldDataType} for a field on the raw
   * API response. Throws if the field's `fieldDisplayType` and `sqlType.name`
   * are both unmappable.
   */
  private resolveFieldDataType(f: FieldMetaData): EntityFieldDataType {
    const mapped = this.tryResolveFieldDataType(f.fieldDisplayType, f.sqlType?.name);
    if (!mapped) {
      throw new ValidationError({
        message: `Cannot determine field type for '${f.name}' (id: ${f.id}) — sqlType '${f.sqlType?.name ?? '(missing)'}' and fieldDisplayType '${f.fieldDisplayType ?? '(missing)'}' are both unrecognized.`,
      });
    }
    return mapped;
  }

  /**
   * Validates that the user-supplied constraint properties on a field are
   * supported by the field's data type. Throws a `ValidationError` listing
   * any unsupported properties.
   */
  private validateFieldConstraints(
    type: EntityFieldDataType,
    field: Pick<EntityCreateFieldOptions, EntityFieldConstraint>,
    fieldName: string,
  ): void {
    const spec = ENTITY_FIELD_CONSTRAINT_SPEC[type] ?? {};
    const supported = Object.keys(spec) as EntityFieldConstraint[];
    const provided = Object.values(EntityFieldConstraint).filter(name => field[name] !== undefined);

    const unsupported = provided.filter(p => !(p in spec));
    if (unsupported.length > 0) {
      const allowedDesc = supported.length > 0 ? supported.join(', ') : 'none';
      throw new ValidationError({
        message: `Field '${fieldName}' of type ${type} does not accept ${unsupported.join(', ')}. Allowed constraints for this type: ${allowedDesc}.`,
      });
    }

    // Range check: each user-supplied constraint must be within its allowed bounds.
    for (const name of provided) {
      const range = spec[name];
      const value = field[name];
      if (range && value !== undefined && (value < range.min || value > range.max)) {
        throw new ValidationError({
          message: `Field '${fieldName}' of type ${type} has ${name} ${value} out of range [${range.min}, ${range.max}].`,
        });
      }
    }

    // Cross-field check: when both bounds are user-supplied in the same call,
    // minValue must be strictly less than maxValue.
    if (field.minValue !== undefined && field.maxValue !== undefined && field.minValue >= field.maxValue) {
      throw new ValidationError({
        message: `Field '${fieldName}' of type ${type} has minValue ${field.minValue} >= maxValue ${field.maxValue}. minValue must be strictly less than maxValue.`,
      });
    }
  }

  /**
   * Returns the sqlType constraint fields for a given field type.
   *
   * The API requires specific constraint properties to be set per SQL type;
   * without them the field is stored in an incomplete state, causing
   * "Field type cannot be changed" errors when the UI later tries to edit
   * advanced options. User-supplied values from `EntityCreateFieldOptions`
   * override the defaults where the type accepts overrides.
   */
  private buildSqlTypeConstraints(type: EntityFieldDataType, field: EntityCreateFieldOptions): Omit<SqlType, 'name'> {
    const defaults = ENTITY_FIELD_CONSTRAINT_DEFAULTS;
    switch (type) {
      case EntityFieldDataType.STRING:
        return { lengthLimit: field.lengthLimit ?? defaults.STRING_LENGTH_LIMIT };
      case EntityFieldDataType.MULTILINE_TEXT:
        return { lengthLimit: field.lengthLimit ?? defaults.MULTILINE_TEXT_LENGTH_LIMIT };
      case EntityFieldDataType.MULTILINE_MAX:
        return { lengthLimit: field.lengthLimit ?? defaults.MULTILINE_MAX_LENGTH_LIMIT };
      case EntityFieldDataType.DECIMAL:
        return {
          lengthLimit: defaults.DECIMAL_LENGTH_LIMIT,
          decimalPrecision: field.decimalPrecision ?? defaults.DECIMAL_PRECISION,
          maxValue: field.maxValue ?? defaults.NUMERIC_MAX_VALUE,
          minValue: field.minValue ?? defaults.NUMERIC_MIN_VALUE,
        };
      case EntityFieldDataType.BOOLEAN:
        return { lengthLimit: defaults.BOOLEAN_LENGTH_LIMIT };
      case EntityFieldDataType.DATE:
      case EntityFieldDataType.DATETIME_WITH_TZ:
        return { lengthLimit: defaults.DATE_LENGTH_LIMIT };
      case EntityFieldDataType.INTEGER:
      case EntityFieldDataType.BIG_INTEGER:
        return {
          maxValue: field.maxValue ?? defaults.NUMERIC_MAX_VALUE,
          minValue: field.minValue ?? defaults.NUMERIC_MIN_VALUE,
        };
      case EntityFieldDataType.FLOAT:
      case EntityFieldDataType.DOUBLE:
        return {
          decimalPrecision: field.decimalPrecision ?? defaults.DECIMAL_PRECISION,
          maxValue: field.maxValue ?? defaults.NUMERIC_MAX_VALUE,
          minValue: field.minValue ?? defaults.NUMERIC_MIN_VALUE,
        };
      case EntityFieldDataType.FILE:
      case EntityFieldDataType.RELATIONSHIP:
        // UNIQUEIDENTIFIER fixed lengthLimit (300)
        return { lengthLimit: defaults.UNIQUEIDENTIFIER_LENGTH_LIMIT };
      case EntityFieldDataType.CHOICE_SET_MULTIPLE:
        // CHOICE_SET_MULTIPLE fixed lengthLimit (4000)
        return { lengthLimit: defaults.CHOICE_SET_MULTIPLE_LENGTH_LIMIT };
      default:
        // UUID, CHOICE_SET_SINGLE, AUTO_NUMBER, DATETIME — (sqlType: { name })
        return {};
    }
  }

}
