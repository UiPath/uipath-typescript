import { ValidationError } from '../../core/errors';
import { BaseService } from '../base';
import { EntityServiceModel, EntityGetResponse, createEntityWithMethods } from '../../models/data-fabric/entities.models';
import {
  EntityGetRecordsByIdOptions,
  EntityGetAllRecordsOptions,
  EntityGetRecordByIdOptions,
  EntityGetRecordByNameOptions,
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
  EntityGetByNameOptions,
  EntityDeleteByIdOptions,
  EntityDeleteRecordByIdOptions,
  EntityUpdateByIdOptions,
  EntityRef,
  SqlType,
  FieldDisplayType,
  ReferenceType,
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
} from '../../models/data-fabric/entities.constants';
import { FieldSchemaPayload, SqlFieldType, EntityFieldConstraint, ResolvedReferenceMeta, EntityJoinPayload } from '../../models/data-fabric/entities.internal-types';
import { track } from '../../core/telemetry';
import { resolveOverride } from '../../utils/overrides/resolve-override';

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

/**
 * Applies the runtime resource-overrides table to a design-time entity name. Data Fabric does
 * not accept a `folderPath` header, so the redirect's `folderPath` field is intentionally ignored
 * — only the redirected `name` is used. Unscoped `entity.<name>` publisher keys still match.
 *
 * Deliberately not named `resolveEntityName` to avoid colliding with the class-private async
 * lookup `EntityService.resolveEntityName(id, folderKey)` (id → name via `GET_BY_ID`).
 */
function applyEntityNameOverride(entityName: string): string {
  const override = resolveOverride('Entity', entityName);
  return override?.name ?? entityName;
}

/**
 * Unwraps an {@link EntityRef} into the identifier and which Data Fabric route to hit.
 * Data Fabric exposes parallel by-id and by-name record/attachment routes, so a ref maps
 * to a direct endpoint switch — this is a synchronous check, not a lookup call.
 *
 * The `{name}` branch is routed through {@link applyEntityNameOverride} so a runtime override
 * redirects the design-time entity name to the target before it becomes part of the URL.
 */
function unwrapEntityRef(entityRef: EntityRef, callerLabel: string): { byId: boolean; identifier: string } {
  const { id, name } = (entityRef ?? {}) as { id?: string; name?: string };
  if (id && name) {
    throw new ValidationError({
      message: `${callerLabel}: entityRef must supply exactly one of 'id' or 'name', not both.`,
    });
  }
  if (id) {
    return { byId: true, identifier: id };
  }
  if (name) {
    return { byId: false, identifier: applyEntityNameOverride(name) };
  }
  throw new ValidationError({
    message: `${callerLabel}: entityRef must supply exactly one of 'id' or 'name'.`,
  });
}

/**
 * Service for interacting with the Data Fabric Entity API
 */
export class EntityService extends BaseService implements EntityServiceModel {
  @track('Entities.GetById')
  async getById(id: string, options?: EntityGetByIdOptions): Promise<EntityGetResponse> {
    return this.fetchEntityMetadata(DATA_FABRIC_ENDPOINTS.ENTITY.GET_BY_ID(id), options?.folderKey);
  }

  @track('Entities.GetByName')
  async getByName(entityName: string, options?: EntityGetByNameOptions): Promise<EntityGetResponse> {
    return this.fetchEntityMetadata(DATA_FABRIC_ENDPOINTS.ENTITY.GET_BY_NAME(applyEntityNameOverride(entityName)), options?.folderKey);
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
    return this.getRecordsImpl<T>(true, entityId, options);
  }

  @track('Entities.GetRecordsByName')
  async getRecordsByName<T extends EntityGetAllRecordsOptions = EntityGetAllRecordsOptions>(
    entityName: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<EntityRecord>
      : NonPaginatedResponse<EntityRecord>
  > {
    return this.getRecordsImpl<T>(false, applyEntityNameOverride(entityName), options);
  }

  @track('Entities.GetRecordById')
  async getRecordById(
    entityId: string,
    recordId: string,
    options: EntityGetRecordByIdOptions = {}
  ): Promise<EntityRecord> {
    return this.getRecordImpl(true, entityId, recordId, options);
  }

  @track('Entities.GetRecordByName')
  async getRecordByName(
    entityName: string,
    recordId: string,
    options: EntityGetRecordByNameOptions = {}
  ): Promise<EntityRecord> {
    return this.getRecordImpl(false, applyEntityNameOverride(entityName), recordId, options);
  }

  @track('Entities.InsertRecord')
  async insertRecord(entityRef: EntityRef, data: Record<string, any>, options: EntityInsertRecordOptions = {}): Promise<EntityInsertResponse> {
    const { byId, identifier } = unwrapEntityRef(entityRef, 'Entities.insertRecord');
    return this.insertRecordImpl(byId, identifier, data, options);
  }

  @track('Entities.InsertRecordById')
  async insertRecordById(id: string, data: Record<string, any>, options: EntityInsertRecordOptions = {}): Promise<EntityInsertResponse> {
    return this.insertRecordImpl(true, id, data, options);
  }

  @track('Entities.InsertRecords')
  async insertRecords(entityRef: EntityRef, data: Record<string, any>[], options: EntityInsertRecordsOptions = {}): Promise<EntityBatchInsertResponse> {
    const { byId, identifier } = unwrapEntityRef(entityRef, 'Entities.insertRecords');
    return this.insertRecordsImpl(byId, identifier, data, options);
  }

  @track('Entities.InsertRecordsById')
  async insertRecordsById(id: string, data: Record<string, any>[], options: EntityInsertRecordsOptions = {}): Promise<EntityBatchInsertResponse> {
    return this.insertRecordsImpl(true, id, data, options);
  }

  @track('Entities.UpdateRecord')
  async updateRecord(entityRef: EntityRef, recordId: string, data: Record<string, any>, options: EntityUpdateRecordOptions = {}): Promise<EntityUpdateRecordResponse> {
    const { byId, identifier } = unwrapEntityRef(entityRef, 'Entities.updateRecord');
    return this.updateRecordImpl(byId, identifier, recordId, data, options);
  }

  @track('Entities.UpdateRecordById')
  async updateRecordById(entityId: string, recordId: string, data: Record<string, any>, options: EntityUpdateRecordOptions = {}): Promise<EntityUpdateRecordResponse> {
    return this.updateRecordImpl(true, entityId, recordId, data, options);
  }

  @track('Entities.UpdateRecords')
  async updateRecords(entityRef: EntityRef, data: EntityRecord[], options: EntityUpdateRecordsOptions = {}): Promise<EntityUpdateResponse> {
    const { byId, identifier } = unwrapEntityRef(entityRef, 'Entities.updateRecords');
    return this.updateRecordsImpl(byId, identifier, data, options);
  }

  @track('Entities.UpdateRecordsById')
  async updateRecordsById(id: string, data: EntityRecord[], options: EntityUpdateRecordsOptions = {}): Promise<EntityUpdateResponse> {
    return this.updateRecordsImpl(true, id, data, options);
  }

  @track('Entities.DeleteRecords')
  async deleteRecords(entityRef: EntityRef, recordIds: string[], options: EntityDeleteRecordsOptions = {}): Promise<EntityDeleteResponse> {
    const { byId, identifier } = unwrapEntityRef(entityRef, 'Entities.deleteRecords');
    return this.deleteRecordsImpl(byId, identifier, recordIds, options);
  }

  @track('Entities.DeleteRecordsById')
  async deleteRecordsById(id: string, recordIds: string[], options: EntityDeleteRecordsOptions = {}): Promise<EntityDeleteResponse> {
    return this.deleteRecordsImpl(true, id, recordIds, options);
  }

  @track('Entities.DeleteRecord')
  async deleteRecord(entityRef: EntityRef, recordId: string, options?: EntityDeleteRecordByIdOptions): Promise<void> {
    const { byId, identifier } = unwrapEntityRef(entityRef, 'Entities.deleteRecord');
    return this.deleteRecordImpl(byId, identifier, recordId, options);
  }

  @track('Entities.DeleteRecordById')
  async deleteRecordById(entityId: string, recordId: string, options?: EntityDeleteRecordByIdOptions): Promise<void> {
    return this.deleteRecordImpl(true, entityId, recordId, options);
  }

  @track('Entities.GetAll')
  async getAll(options?: EntityGetAllOptions): Promise<EntityGetResponse[]> {
    // folderKey is preferred over includeFolderEntities: when present, scope to that folder
    // via the v1 endpoint + header. Only when no folderKey is given AND includeFolderEntities
    // is explicitly true does the SDK switch to the v2 endpoint (returns tenant + folder
    // entities together). Default (no options or includeFolderEntities omitted) stays on
    // the v1 endpoint = tenant only.
    const endpoint = !options?.folderKey && options?.includeFolderEntities
      ? DATA_FABRIC_ENDPOINTS.ENTITY.GET_ALL_V2
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

  @track('Entities.QueryRecords')
  async queryRecords<T extends EntityQueryRecordsOptions = EntityQueryRecordsOptions>(
    entityRef: EntityRef,
    options?: T
  ): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<EntityRecord> : NonPaginatedResponse<EntityRecord>> {
    const { byId, identifier } = unwrapEntityRef(entityRef, 'Entities.queryRecords');
    return this.queryRecordsImpl<T>(byId, identifier, options);
  }

  @track('Entities.QueryRecordsById')
  async queryRecordsById<T extends EntityQueryRecordsOptions = EntityQueryRecordsOptions>(
    id: string,
    options?: T
  ): Promise<T extends HasPaginationOptions<T> ? PaginatedResponse<EntityRecord> : NonPaginatedResponse<EntityRecord>> {
    return this.queryRecordsImpl<T>(true, id, options);
  }

  @track('Entities.ImportRecords')
  async importRecords(entityRef: EntityRef, file: EntityFileType, options?: EntityImportRecordsByIdOptions): Promise<EntityImportRecordsResponse> {
    const { byId, identifier } = unwrapEntityRef(entityRef, 'Entities.importRecords');
    return this.importRecordsImpl(byId, identifier, file, options);
  }

  @track('Entities.ImportRecordsById')
  async importRecordsById(id: string, file: EntityFileType, options?: EntityImportRecordsByIdOptions): Promise<EntityImportRecordsResponse> {
    return this.importRecordsImpl(true, id, file, options);
  }

  @track('Entities.DownloadAttachment')
  async downloadAttachment(entityRef: EntityRef, recordId: string, fieldName: string, options?: EntityDownloadAttachmentOptions): Promise<Blob> {
    const { byId, identifier } = unwrapEntityRef(entityRef, 'Entities.downloadAttachment');
    const response = await this.get<Blob>(
      byId
        ? DATA_FABRIC_ENDPOINTS.ENTITY.DOWNLOAD_ATTACHMENT(identifier, recordId, fieldName)
        : DATA_FABRIC_ENDPOINTS.ENTITY.ATTACHMENT_BY_NAME(identifier, recordId, fieldName),
      {
        responseType: RESPONSE_TYPES.BLOB,
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
      }
    );

    return response.data;
  }

  @track('Entities.UploadAttachment')
  async uploadAttachment(entityRef: EntityRef, recordId: string, fieldName: string, file: EntityFileType, options?: EntityUploadAttachmentOptions): Promise<EntityUploadAttachmentResponse> {
    const { byId, identifier } = unwrapEntityRef(entityRef, 'Entities.uploadAttachment');
    const formData = new FormData();
    if (file instanceof Uint8Array) {
      formData.append('file', new Blob([file.buffer as ArrayBuffer]));
    } else {
      formData.append('file', file);
    }

    const params = createParams({ expansionLevel: options?.expansionLevel });

    const response = await this.post<EntityUploadAttachmentResponse>(
      byId
        ? DATA_FABRIC_ENDPOINTS.ENTITY.UPLOAD_ATTACHMENT(identifier, recordId, fieldName)
        : DATA_FABRIC_ENDPOINTS.ENTITY.ATTACHMENT_BY_NAME(identifier, recordId, fieldName),
      formData,
      {
        params,
        headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }),
      }
    );

    return response.data;
  }

  @track('Entities.DeleteAttachment')
  async deleteAttachment(entityRef: EntityRef, recordId: string, fieldName: string, options?: EntityDeleteAttachmentOptions): Promise<EntityDeleteAttachmentResponse> {
    const { byId, identifier } = unwrapEntityRef(entityRef, 'Entities.deleteAttachment');
    const response = await this.delete<EntityDeleteAttachmentResponse>(
      byId
        ? DATA_FABRIC_ENDPOINTS.ENTITY.DELETE_ATTACHMENT(identifier, recordId, fieldName)
        : DATA_FABRIC_ENDPOINTS.ENTITY.ATTACHMENT_BY_NAME(identifier, recordId, fieldName),
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
    const fieldPayloads = await this.buildFieldsWithReferenceMeta(fields);
    const payload = {
      ...(opts.description !== undefined && { description: opts.description }),
      displayName: opts.displayName ?? name,
      entityDefinition: {
        name,
        fields: fieldPayloads,
        folderId: opts.folderKey ?? DATA_FABRIC_TENANT_FOLDER_ID,
        isRbacEnabled: opts.isRbacEnabled ?? false,
        isInsightsEnabled: opts.isAnalyticsEnabled ?? false,
        externalFields: opts.externalFields ?? [],
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
    const hasSchemaChanges = !!(opts.addFields?.length || opts.removeFields?.length || opts.updateFields?.length);
    const hasMetadataChanges = opts.displayName !== undefined || opts.description !== undefined || opts.isRbacEnabled !== undefined;

    if (!hasSchemaChanges && !hasMetadataChanges) {
      throw new ValidationError({
        message: 'updateById requires at least one change — pass addFields, removeFields, updateFields, displayName, description, or isRbacEnabled.',
      });
    }

    if (hasSchemaChanges) {
      await this.applySchemaUpdate(id, opts);
    }
    if (hasMetadataChanges) {
      await this.patch(
        DATA_FABRIC_ENDPOINTS.ENTITY.UPDATE(id),
        {
          ...(opts.displayName !== undefined && { displayName: opts.displayName }),
          ...(opts.description !== undefined && { description: opts.description }),
          ...(opts.isRbacEnabled !== undefined && { isRbacEnabled: opts.isRbacEnabled }),
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
  private async applySchemaUpdate(entityId: string, options: Pick<EntityUpdateByIdOptions, 'addFields' | 'removeFields' | 'updateFields' | 'folderKey'>): Promise<void> {
    const folderHeaders = createHeaders({ [FOLDER_KEY]: options.folderKey });
    const entityResponse = await this.get<RawEntityGetResponse>(
      DATA_FABRIC_ENDPOINTS.ENTITY.GET_BY_ID(entityId),
      { headers: folderHeaders },
    );
    const raw = entityResponse.data;

    // Carry forward existing non-system fields from GET response (skip system/primary-key fields)
    let fields: FieldMetaData[] = (raw.fields ?? [])
      .filter(f => !f.isSystemField && !f.isPrimaryKey);

    // Filter out removed fields
    if (options.removeFields?.length) {
      const existingNames = new Set(fields.map(f => f.name));
      const missing = options.removeFields.filter(r => !existingNames.has(r.name)).map(r => r.name);
      if (missing.length) {
        throw new ValidationError({
          message: `Cannot remove field(s) — no matching non-system field found for name(s): ${missing.join(', ')}.`,
        });
      }
      const removeSet = new Set(options.removeFields.map(r => r.name));
      fields = fields.filter(f => !removeSet.has(f.name));
    }

    // Apply per-field metadata updates (matched by field ID)
    if (options.updateFields?.length) {
      const existingIds = new Set(fields.map(f => f.id));
      const missing = options.updateFields.filter(u => !existingIds.has(u.id)).map(u => u.id);
      if (missing.length) {
        throw new ValidationError({
          message: `Cannot update field(s) — no matching non-system field found for id(s): ${missing.join(', ')}.`,
        });
      }
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
          externalFields: raw.externalFields ?? [],
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

  private async fetchEntityMetadata(endpoint: string, folderKey?: string): Promise<EntityGetResponse> {
    const response = await this.get<RawEntityGetResponse>(
      endpoint,
      { headers: createHeaders({ [FOLDER_KEY]: folderKey }) }
    );
    const metadata = transformData(response.data as RawEntityGetResponse, EntityMap);
    this.applyFieldMappings(metadata);
    return createEntityWithMethods(metadata, this);
  }

  private getRecordsImpl<T extends EntityGetAllRecordsOptions = EntityGetAllRecordsOptions>(
    byId: boolean,
    identifier: string,
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
      getEndpoint: () => byId
        ? DATA_FABRIC_ENDPOINTS.ENTITY.GET_ENTITY_RECORDS(identifier)
        : DATA_FABRIC_ENDPOINTS.ENTITY.GET_ENTITY_RECORDS_BY_NAME(identifier),
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

  private async getRecordImpl(
    byId: boolean,
    identifier: string,
    recordId: string,
    options: EntityGetRecordByIdOptions
  ): Promise<EntityRecord> {
    const params = createParams({ expansionLevel: options.expansionLevel });
    const response = await this.get<EntityRecord>(
      byId
        ? DATA_FABRIC_ENDPOINTS.ENTITY.GET_RECORD_BY_ID(identifier, recordId)
        : DATA_FABRIC_ENDPOINTS.ENTITY.GET_RECORD_BY_NAME(identifier, recordId),
      { params, headers: createHeaders({ [FOLDER_KEY]: options.folderKey }) }
    );
    return response.data;
  }

  private async insertRecordImpl(byId: boolean, identifier: string, data: Record<string, any>, options: EntityInsertRecordOptions): Promise<EntityInsertResponse> {
    const params = createParams({ expansionLevel: options.expansionLevel });
    const response = await this.post<EntityInsertResponse>(
      byId
        ? DATA_FABRIC_ENDPOINTS.ENTITY.INSERT_BY_ID(identifier)
        : DATA_FABRIC_ENDPOINTS.ENTITY.INSERT_BY_NAME(identifier),
      data,
      { params, headers: createHeaders({ [FOLDER_KEY]: options.folderKey }) }
    );
    return response.data;
  }

  private async insertRecordsImpl(byId: boolean, identifier: string, data: Record<string, any>[], options: EntityInsertRecordsOptions): Promise<EntityBatchInsertResponse> {
    const params = createParams({ expansionLevel: options.expansionLevel, failOnFirst: options.failOnFirst });
    const response = await this.post<EntityBatchInsertResponse>(
      byId
        ? DATA_FABRIC_ENDPOINTS.ENTITY.BATCH_INSERT_BY_ID(identifier)
        : DATA_FABRIC_ENDPOINTS.ENTITY.BATCH_INSERT_BY_NAME(identifier),
      data,
      { params, headers: createHeaders({ [FOLDER_KEY]: options.folderKey }) }
    );
    return response.data;
  }

  private async updateRecordImpl(byId: boolean, identifier: string, recordId: string, data: Record<string, any>, options: EntityUpdateRecordOptions): Promise<EntityUpdateRecordResponse> {
    const params = createParams({ expansionLevel: options.expansionLevel });
    const response = await this.post<EntityUpdateRecordResponse>(
      byId
        ? DATA_FABRIC_ENDPOINTS.ENTITY.UPDATE_RECORD_BY_ID(identifier, recordId)
        : DATA_FABRIC_ENDPOINTS.ENTITY.UPDATE_RECORD_BY_NAME(identifier, recordId),
      data,
      { params, headers: createHeaders({ [FOLDER_KEY]: options.folderKey }) }
    );
    return response.data;
  }

  private async updateRecordsImpl(byId: boolean, identifier: string, data: EntityRecord[], options: EntityUpdateRecordsOptions): Promise<EntityUpdateResponse> {
    const params = createParams({ expansionLevel: options.expansionLevel, failOnFirst: options.failOnFirst });
    const response = await this.post<EntityUpdateResponse>(
      byId
        ? DATA_FABRIC_ENDPOINTS.ENTITY.UPDATE_BY_ID(identifier)
        : DATA_FABRIC_ENDPOINTS.ENTITY.UPDATE_BY_NAME(identifier),
      data,
      { params, headers: createHeaders({ [FOLDER_KEY]: options.folderKey }) }
    );
    return response.data;
  }

  private async deleteRecordsImpl(byId: boolean, identifier: string, recordIds: string[], options: EntityDeleteRecordsOptions): Promise<EntityDeleteResponse> {
    const params = createParams({ failOnFirst: options.failOnFirst });
    const response = await this.post<EntityDeleteResponse>(
      byId
        ? DATA_FABRIC_ENDPOINTS.ENTITY.DELETE_BY_ID(identifier)
        : DATA_FABRIC_ENDPOINTS.ENTITY.DELETE_BY_NAME(identifier),
      recordIds,
      { params, headers: createHeaders({ [FOLDER_KEY]: options.folderKey }) }
    );
    return response.data;
  }

  private async deleteRecordImpl(byId: boolean, identifier: string, recordId: string, options?: EntityDeleteRecordByIdOptions): Promise<void> {
    await this.delete(
      byId
        ? DATA_FABRIC_ENDPOINTS.ENTITY.DELETE_RECORD_BY_ID(identifier, recordId)
        : DATA_FABRIC_ENDPOINTS.ENTITY.DELETE_RECORD_BY_NAME(identifier, recordId),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) },
    );
  }

  private async queryRecordsImpl<T extends EntityQueryRecordsOptions = EntityQueryRecordsOptions>(
    byId: boolean,
    identifier: string,
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
    // The server's aggregates-only HAVING contract requires aggregates + groupBy;
    // surface that requirement client-side with an actionable message.
    if (options?.havingFilter && (!options.aggregates?.length || !options.groupBy?.length)) {
      throw new ValidationError({
        message: 'havingFilter requires aggregates and groupBy — conditions reference declared aggregate aliases; use filterGroup for row-level conditions',
      });
    }
    // folderKey is header-only; expansionLevel must be sent as a query param by PaginationHelpers.
    const { folderKey, expansionLevel, ...rest } = options ?? {};
    // The multi-entity (joins) contract only exists on the name-based query route —
    // the ID-based route silently drops the `joins` body key. When addressing by id, resolve
    // the name (by name, it is already known); then translate each join to the wire shape.
    let getEndpoint = () => byId
      ? DATA_FABRIC_ENDPOINTS.ENTITY.QUERY_BY_ID(identifier)
      : DATA_FABRIC_ENDPOINTS.ENTITY.QUERY_BY_NAME(identifier);
    if (options?.joins && options.joins.length > 0) {
      const baseEntityName = byId ? await this.resolveEntityName(identifier, folderKey) : identifier;
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
      excludeFromPrefix: ['filterGroup', 'selectedFields', 'sortOptions', 'aggregates', 'groupBy', 'joins', 'havingFilter']
    }, downstreamOptions);
  }

  private async importRecordsImpl(byId: boolean, identifier: string, file: EntityFileType, options?: EntityImportRecordsByIdOptions): Promise<EntityImportRecordsResponse> {
    const formData = new FormData();
    if (file instanceof Uint8Array) {
      formData.append('file', new Blob([file.buffer as ArrayBuffer]));
    } else {
      formData.append('file', file);
    }

    const response = await this.post<EntityImportRecordsResponse>(
      byId
        ? DATA_FABRIC_ENDPOINTS.ENTITY.BULK_UPLOAD_BY_ID(identifier)
        : DATA_FABRIC_ENDPOINTS.ENTITY.BULK_UPLOAD_BY_NAME(identifier),
      formData,
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) },
    );

    return response.data;
  }

}
