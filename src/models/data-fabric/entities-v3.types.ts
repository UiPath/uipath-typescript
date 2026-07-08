/**
 * Public types for the Data Fabric Entity **v3** API.
 *
 * v3 adds composite-entity support (a logical entity backed by multiple related
 * "member" tables) on top of the v1/v2 surface. Every v3 read/query returns a
 * {@link EntityV3QueryResponse} envelope and every write returns an
 * {@link EntityV3WriteResponse} envelope. For non-composite entities the
 * `children` map is empty; for composite entities it is keyed by member
 * instance name.
 *
 * Record field values are returned exactly as the API sends them (Data Fabric
 * schema columns are user-defined — their casing is part of the schema contract
 * and is never transformed).
 */

import { PaginationOptions } from '../../utils/pagination/types';
import {
  EntityQueryFilterGroup,
  EntityQuerySortOption,
  EntityAggregate,
  EntityJoin,
  EntityFieldDataType,
  SqlType,
} from './entities.types';
import { EntityFolderScopedOptions } from './data-fabric.types';

// ---------------------------------------------------------------------------
// Response envelopes
// ---------------------------------------------------------------------------

/**
 * A page of a composite entity's child (member) records, returned inside the
 * `children` map of an {@link EntityV3WriteResponse}. For non-composite entities
 * the `children` map is empty and this type never appears.
 */
export interface ChildArrayBlock {
  /** The child records in this block. Field names are returned exactly as stored. */
  records: Record<string, unknown>[];
  /** `true` when more child records exist than were returned — use {@link ref} to fetch the rest. */
  hasMore: boolean;
  /**
   * A ready-to-use member sub-resource query descriptor for fetching the
   * remaining children. `null` when {@link hasMore} is `false`.
   */
  ref?: ChildArrayPaginationRef | null;
}

/**
 * A server-provided descriptor for paginating a composite entity's child records
 * via the member sub-resource query endpoint.
 */
export interface ChildArrayPaginationRef {
  /** Relative URL of the member sub-resource query endpoint. */
  queryUrl: string;
  /** Request body to POST to {@link queryUrl} to fetch the next block of children. */
  queryRequest: Record<string, unknown>;
}

/**
 * Universal v3 write/record envelope. Root entity field values are flattened to
 * the top level alongside the envelope properties. For non-composite entities
 * `children` is an empty map; for composite entities it is keyed by member
 * instance name.
 *
 * @example
 * ```typescript
 * // Non-composite record
 * { Id: "guid-1", Name: "Alice", Email: "alice@example.com", children: {} }
 *
 * // Composite record with children
 * { Id: "guid-1", CaseId: "CASE-001", children: { Comments: { records: [...], hasMore: false } } }
 * ```
 */
export interface EntityV3WriteResponse {
  /** System Id (GUID) of the root record. Always present on read/write responses. */
  Id: string;
  /** Child records keyed by member instance name. Empty map for non-composite entities. */
  children: Record<string, ChildArrayBlock>;
  /** Cascade-delete counts per member instance name. Present only on delete responses. */
  cascadeDeletedChildren?: Record<string, number>;
  /** Number of records deleted by a delete operation. */
  deletedCount?: number;
  /** Number of records updated by an update operation. */
  updatedCount?: number;
  /** Root entity field values, flattened to the top level. Field names are returned exactly as stored. */
  [field: string]: unknown;
}

/**
 * Universal v3 query/list response envelope. Returned by every v3 read/query
 * endpoint on the composite entity itself.
 */
export interface EntityV3QueryResponse {
  /** The page of records returned by this query. */
  value: EntityV3WriteResponse[];
  /** Total number of root records matching the query (before pagination). */
  totalRecordCount: number;
  /**
   * `true` when a single-JOIN fallback was used because cross-entity filters were
   * present, in which case {@link totalRecordCount} is an estimate. `false` for
   * standard queries.
   */
  totalRecordCountIsEstimate?: boolean;
}

/**
 * Response from the `query_expansion` endpoint. Returns the records both as a
 * pre-serialised JSON string ({@link jsonValue}) and as an array.
 */
export interface EntityV3QueryExpansionResponse {
  /** The full result set serialised as a JSON string. */
  jsonValue?: string;
  /** Total number of records matching the query (before pagination). */
  totalRecordCount: number;
  /** The page of records returned by this query. Field names are returned exactly as stored. */
  value: Record<string, unknown>[];
}

/**
 * Response from deleting one or more member records.
 */
export interface EntityV3MemberDeleteResponse {
  /** System Id (GUID) of the deleted record for a single delete; omitted for bulk deletes. */
  recordId?: string;
  /** Number of records deleted by this operation. */
  deletedCount: number;
  /** Cascade-delete counts per member instance name (children of the deleted member). */
  cascadeDeletedChildren?: Record<string, number>;
}

/**
 * A single failed record in a batch operation.
 */
export interface EntityV3BatchFailureRecord {
  /** Error message describing why the record failed. */
  error?: string;
  /** The original record that failed. Field names are returned exactly as stored. */
  record?: Record<string, unknown>;
}

/**
 * Response from a batch operation (insert-batch / update-batch / delete-batch),
 * partitioning results into successes and failures.
 */
export interface EntityV3BatchResponse {
  /** Records that were processed successfully. Field names are returned exactly as stored. */
  successRecords: Record<string, unknown>[];
  /** Records that failed, each with an error message. */
  failureRecords: EntityV3BatchFailureRecord[];
}

// ---------------------------------------------------------------------------
// Schema / metadata responses
// ---------------------------------------------------------------------------

/**
 * One member (underlying table) of a composite entity, as returned in
 * {@link EntityV3CompositeInfo}.
 */
export interface EntityV3CompositeMember {
  /** GUID of the member entity. */
  entityId: string;
  /** Instance name of the member — used as the key in `children` maps and as the member path segment. */
  entityName: string;
  /** Human-readable display name of the member. */
  displayName: string;
  /** `true` for the root (anchor) member of the composite. */
  isRoot: boolean;
  /** Instance name of the parent member, or `null` for the root. */
  parentEntityName?: string | null;
  /** Name of the FK field on this member pointing at its parent, or `null` for the root. */
  foreignKeyFieldName?: string | null;
  /** Name of the target field on the parent that {@link foreignKeyFieldName} references, or `null` for the root. */
  parentTargetFieldName?: string | null;
}

/**
 * Composite-specific structure describing a composite entity's member tree.
 */
export interface EntityV3CompositeInfo {
  /** GUID of the composite entity. */
  entityId: string;
  /** Instance name of the root member. */
  rootEntityName?: string | null;
  /** All members of the composite, including the root. */
  members?: EntityV3CompositeMember[] | null;
}

/**
 * Entity schema metadata returned by the v3 metadata and listing endpoints.
 * When {@link isComposite} is `true`, {@link compositeInfo} describes the member tree.
 */
export interface EntityV3Metadata {
  /** GUID of the entity. */
  id: string;
  /** Entity name (unique identifier used in data-plane routes). */
  name: string;
  /** Human-readable display name. */
  displayName: string;
  /** `true` when the entity is a composite (backed by multiple member tables). */
  isComposite?: boolean;
  /** Member tree structure, present only when {@link isComposite} is `true`. */
  compositeInfo?: EntityV3CompositeInfo;
  /** Classification of the entity (e.g. `"Entity"`, `"CaseComposite"`, `"CompositeMember"`). */
  entityClass?: string | null;
  /** Template driving schema validation (e.g. `"Case"`, `"CaseComment"`), when applicable. */
  templateName?: string | null;
  /** Optional entity description. */
  description?: string | null;
  /** GUID of the folder the entity belongs to. */
  folderId?: string;
  /** Field definitions of the entity. */
  fields?: Record<string, unknown>[] | null;
  /** Number of records stored in the entity. */
  recordCount?: number | null;
  /** Whether role-based access control is enabled. */
  isRbacEnabled?: boolean;
  /** Whether Insights/Analytics integration is enabled. */
  isInsightsEnabled?: boolean;
}

/**
 * Response from the v3 entity-listing endpoint, which returns entities and
 * choice sets side by side. Composite members are hidden from this listing.
 */
export interface EntityV3ListResponse {
  /** Entity schema metadata records. */
  entities?: EntityV3Metadata[] | null;
  /** Choice sets in scope. */
  choicesets?: Record<string, unknown>[] | null;
}

// ---------------------------------------------------------------------------
// Request bodies for data-plane operations
// ---------------------------------------------------------------------------

/**
 * A single record to insert, update, or upsert. For composite entities, include
 * child arrays keyed by member instance name alongside the root fields; foreign
 * keys are inferred from nesting position.
 *
 * @example
 * ```typescript
 * // Composite insert with nested children
 * {
 *   CaseId: "CASE-001",
 *   CaseStatus: "Open",
 *   Comments: [{ CommentId: "CMT-001", Comment: "Initial triage" }]
 * }
 * ```
 */
export type EntityV3RecordInput = Record<string, unknown>;

/**
 * Conditional (filtered) update request for `updateWhere`. Every matching record
 * has {@link fieldValues} applied. For composite entities the filter and field
 * values must target a single member via the `Member.Field` prefix convention.
 */
export interface EntityV3ConditionalUpdateRequest {
  /** Filter selecting which records to update. Omit to match all records. */
  filterGroup?: EntityQueryFilterGroup;
  /** Field values to set on every matching record. */
  fieldValues: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Options types
// ---------------------------------------------------------------------------

/** Options for listing v3 entities. */
export interface EntityV3GetAllOptions extends EntityFolderScopedOptions {
  /** Filter the listing by entity classification (e.g. `"CaseComposite"`). */
  entityClass?: string;
}

/** Options for the `all` listing endpoint (entities + choice sets), which uses a raw start/limit window. */
export interface EntityV3GetAllPagedOptions extends EntityFolderScopedOptions {
  /** Zero-based offset of the first entity to return (default: 0). */
  start?: number;
  /** Maximum number of entities to return (default: 1000). */
  limit?: number;
}

/** Options carrying the expansion level for composite child data (default: 0). */
export interface EntityV3ExpansionOptions extends EntityFolderScopedOptions {
  /** Depth of composite member expansion to include in the response (default: 0). */
  expansionLevel?: number;
}

/** Options for reading a page of records with `getRecords`. */
export type EntityV3ReadOptions = {
  /** Depth of composite member expansion to include in the response (default: 0). */
  expansionLevel?: number;
} & PaginationOptions & EntityFolderScopedOptions;

/** Options for reading a single record by id or key. */
export interface EntityV3GetRecordOptions extends EntityV3ExpansionOptions {}

/**
 * Options for querying records. Extends the standard query surface (filters,
 * sorting, aggregates, joins, pagination) with a per-root cap on child records.
 */
export type EntityV3QueryOptions = {
  /** Filter conditions to apply. */
  filterGroup?: EntityQueryFilterGroup;
  /** Field names to include (returns all fields if omitted). For composites, prefix member fields as `Member.Field`. */
  selectedFields?: string[];
  /** Sort options for the results. */
  sortOptions?: EntityQuerySortOption[];
  /** Depth of composite member expansion to include (default: 0). */
  expansionLevel?: number;
  /** Aggregate expressions (COUNT, SUM, AVG, MIN, MAX) to apply. */
  aggregates?: EntityAggregate[];
  /** Field names to group aggregate results by. */
  groupBy?: string[];
  /** Cross-entity joins (max 3, all the same join type). */
  joins?: EntityJoin[];
  /** Maximum child records returned per root record per member type. */
  childLimit?: number;
} & PaginationOptions & EntityFolderScopedOptions;

/** Options for inserting a single record. */
export interface EntityV3InsertOptions extends EntityV3ExpansionOptions {}

/** Options for batch insert/update operations. */
export interface EntityV3BatchOptions extends EntityV3ExpansionOptions {
  /** Whether to stop at the first failing record (default: false). */
  failOnFirst?: boolean;
}

/** Options for updating a single record. */
export interface EntityV3UpdateOptions extends EntityV3ExpansionOptions {}

/** Options for deleting records. */
export interface EntityV3DeleteOptions extends EntityFolderScopedOptions {}

/** Options for bulk insert (folder scope only). */
export interface EntityV3InsertBulkOptions extends EntityFolderScopedOptions {}

/** Options for a conditional update-where (folder scope only). */
export interface EntityV3UpdateWhereOptions extends EntityFolderScopedOptions {}

/** Options for batch delete. */
export interface EntityV3DeleteBatchOptions extends EntityFolderScopedOptions {
  /** Whether to stop at the first failing record (default: false). */
  failOnFirst?: boolean;
}

/** Options for reading a page of member records. */
export type EntityV3MemberReadOptions = PaginationOptions & EntityFolderScopedOptions;

/** Options for reading a single member record by id or key. */
export interface EntityV3MemberGetRecordOptions extends EntityFolderScopedOptions {}

/**
 * Options for querying member records. Member fields are local (no prefix needed),
 * so this is the standard query surface without `childLimit`.
 */
export type EntityV3MemberQueryOptions = {
  /** Filter conditions to apply. */
  filterGroup?: EntityQueryFilterGroup;
  /** Field names to include (returns all fields if omitted). */
  selectedFields?: string[];
  /** Sort options for the results. */
  sortOptions?: EntityQuerySortOption[];
  /** Aggregate expressions to apply. */
  aggregates?: EntityAggregate[];
  /** Field names to group aggregate results by. */
  groupBy?: string[];
} & PaginationOptions & EntityFolderScopedOptions;

/** Options for uploading an attachment. */
export interface EntityV3UploadAttachmentOptions extends EntityV3ExpansionOptions {}

/** Options for downloading an attachment. */
export interface EntityV3DownloadAttachmentOptions extends EntityFolderScopedOptions {}

/** Options for deleting an attachment. */
export interface EntityV3DeleteAttachmentOptions extends EntityV3ExpansionOptions {}

/** Options for reading/creating/deleting entity schema. */
export interface EntityV3SchemaOptions extends EntityFolderScopedOptions {}

// ---------------------------------------------------------------------------
// Schema-write request bodies
// ---------------------------------------------------------------------------

/**
 * Wire-shaped field definition for schema-write operations (create entity /
 * create field). Reuses the API's field-definition shape.
 */
export interface EntityV3FieldDefinition {
  /** Field name — starts with a letter, letters/numbers/underscores only. */
  name: string;
  /** Human-readable display name (defaults to `name`). */
  displayName?: string;
  /** Optional field description. */
  description?: string;
  /** Whether the field is required. */
  isRequired?: boolean;
  /** Whether the field value must be unique. */
  isUnique?: boolean;
  /** Whether the field is a foreign key referencing another member (composite create). */
  isForeignKey?: boolean;
  /** For FK fields: instance name of the referenced member within the create request. */
  referencesEntityName?: string;
  /** For FK fields: name of the target field on the referenced member. */
  referencesFieldName?: string;
  /** Whether the field value is encrypted at rest. */
  isEncrypted?: boolean;
  /** Whether role-based access control is enabled for this field. */
  isRbacEnabled?: boolean;
  /** Default value for the field. */
  defaultValue?: string;
  /** SQL type descriptor (name + optional length/precision/range). */
  sqlType?: SqlType;
  /** SDK field data type (alternative to {@link sqlType}). */
  fieldDataType?: { name: EntityFieldDataType };
}

/**
 * The schema definition for one entity (or composite member) in a create request.
 */
export interface EntityV3EntityDefinition {
  /** Entity instance name — unique within the create request. */
  name: string;
  /** Entity type. Use a numeric type id or an entity-type string as required by the API. */
  entityType?: number | string;
  /** Template driving schema validation (e.g. `"Case"`, `"CaseComment"`), when applicable. */
  templateName?: string;
  /** Field definitions for the entity. */
  fields: EntityV3FieldDefinition[];
  /** External field sources — must be empty for composite members. */
  externalFields?: unknown[];
}

/** One member entry in a composite create request. */
export interface EntityV3CreateMember {
  /** Human-readable display name of the member. */
  displayName?: string;
  /** The member's schema definition. */
  entityDefinition: EntityV3EntityDefinition;
}

/**
 * Request body for creating an entity via v3. Omit `members` to create a single
 * entity; include a non-empty `members` array to create a composite entity.
 */
export interface EntityV3CreateRequest {
  /** Entity name (composite) — the logical business entity name. */
  name?: string;
  /** Human-readable display name. */
  displayName?: string;
  /** Optional description. */
  description?: string;
  /** GUID of the target folder. */
  folderId?: string;
  /** Entity type (numeric id or string). Required for composite creation. */
  entityType?: number | string;
  /** Schema definition for a single (non-composite) entity. */
  entityDefinition?: EntityV3EntityDefinition;
  /** Member definitions for a composite entity (ordered; root inferred from FK graph). */
  members?: EntityV3CreateMember[];
}

/** Response from creating a composite entity. */
export interface EntityV3CompositeCreateResponse {
  /** GUID of the created composite entity. */
  entityId: string;
  /** Composite entity name. */
  name: string;
  /** Created members keyed by instance name. */
  members: Record<string, { entityId: string; entityName: string; displayName: string }>;
}

/** Request body for updating entity metadata. */
export interface EntityV3UpdateMetadataRequest {
  /** New display name (required). */
  displayName: string;
  /** New description. */
  description?: string;
  /** GUID of the folder the entity belongs to. */
  folderId?: string;
  /** Whether role-based access control is enabled. */
  isRbacEnabled?: boolean;
  /** Whether Insights/Analytics integration is enabled. */
  isInsightsEnabled?: boolean;
}

/** Request body for creating a field on an entity or composite member. */
export interface EntityV3FieldCreateRequest {
  /** The field definition to create. */
  fieldDefinition: EntityV3FieldDefinition;
}

/** Request body for updating field metadata. */
export interface EntityV3FieldUpdateRequest {
  /** New display name. */
  displayName?: string;
  /** New description. */
  description?: string;
  /** Whether the field is required. */
  isRequired?: boolean;
  /** Whether the field value is encrypted at rest. */
  isEncrypted?: boolean;
  /** Default value for the field. */
  defaultValue?: string;
  /** SQL type descriptor (the SQL type name itself is immutable). */
  sqlType?: SqlType;
  /** Whether role-based access control is enabled for this field. */
  isRbacEnabled?: boolean;
  /** Whether the field value must be unique. */
  isUnique?: boolean;
}

// ---------------------------------------------------------------------------
// Autopilot
// ---------------------------------------------------------------------------

/**
 * Request body for AI-assisted entity management (autopilot). The shape mirrors
 * the backend contract; pass the conversation, query, and context the assistant
 * needs.
 */
export interface EntityV3AutopilotRequest {
  /** Prior conversation turns for context. */
  conversations?: Record<string, unknown>[];
  /** The natural-language instruction. */
  query?: string;
  /** Entity relationship context. */
  entityRelationship?: Record<string, unknown>;
  /** Integration Service connections available to the assistant. */
  connections?: Record<string, unknown>[];
  /** Actions the assistant may take. */
  actions?: Record<string, unknown>[];
  /** Additional metadata. */
  metadata?: Record<string, unknown>;
}

/** Response from a non-streaming autopilot `manage` call. */
export interface EntityV3AutopilotResponse {
  /** Whether the operation succeeded. */
  isSuccess: boolean;
  /** Human-readable message. */
  message?: string;
  /** The action the assistant took. */
  action?: string;
  /** Resulting entity relationship context. */
  entityRelationship?: Record<string, unknown>;
}
