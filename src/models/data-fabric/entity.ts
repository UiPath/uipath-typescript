import { PaginatedResponse } from '../../utils/builders/query-builder';

/**
 * Base pagination options
 */
export interface PaginationOptions {
  start?: number;
  limit?: number;
}

/**
 * Base options for entity queries
 */
export interface EntityQueryOptions extends PaginationOptions {
  /** Level of related entity expansion (default: 0) */
  expansionLevel?: number;
  /** Fields to include in the response */
  select?: string[];
  /** Sort options */
  sort?: SortOption[];
  /** Field expansions */
  expand?: ExpansionOption[];
}

/**
 * User-friendly sort option
 */
export interface SortOption {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  descending?: boolean;
}

/**
 * User-friendly expansion option
 */
export interface ExpansionOption {
  /** Field to expand */
  field: string;
  /** Fields to select from expanded entity */
  select?: string[];
  /** Nested expansions */
  expand?: ExpansionOption[];
  /** Optional alias for the expanded field */
  alias?: string;
  /** Optional left table name for the join */
  leftTableName?: string;
  /** Optional left entity ID for the join */
  leftEntityId?: string;
  /** Optional table name for the join */
  tableName?: string;
}

/**
 * User-friendly filter operators
 */
export enum FilterOperator {
  Equals = '=',
  NotEquals = '!=',
  GreaterThan = '>',
  GreaterThanOrEqual = '>=',
  LessThan = '<',
  LessThanOrEqual = '<=',
  Contains = 'contains',
  StartsWith = 'startswith',
  EndsWith = 'endswith',
  In = 'in',
  NotIn = 'notin'
}

/**
 * User-friendly logical operators
 */
export enum LogicalOperator {
  And = 'and',
  Or = 'or'
}

/**
 * User-friendly filter condition
 */
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

/**
 * User-friendly filter expression
 */
export interface FilterExpression {
  operator: LogicalOperator;
  conditions: (FilterCondition | FilterExpression)[];
  expansions?: ExpansionOption[];
}

// API-specific interfaces
interface ApiQueryFilter {
  fieldName: string;
  operator: string;
  value?: string;
  valueList?: string[];
}

interface ApiQueryFilterGroup {
  logicalOperator: 0 | 1; // 0 = AND, 1 = OR
  queryFilters?: ApiQueryFilter[];
  filterGroups?: ApiQueryFilterGroup[];
  expansions?: ApiExpansion[];
}

interface ApiExpansion {
  expandedField: string;
  selectedFields?: string[];
  expansions?: ApiExpansion[];
  alias?: string;
  leftTableName?: string;
  leftEntityId?: string;
  tableName?: string;
  expandedFieldInternal?: string;
  selectedFieldsInternal?: string[];
  entity?: any; // EntityDefinition type would be more specific
}

export interface EntityDataQueryRequest {
  selectedFields?: string[];
  start?: number;
  limit?: number;
  sortOptions?: Array<{
    fieldName: string;
    isDescending: boolean;
  }>;
  expansions?: ApiExpansion[];
  filterGroup?: ApiQueryFilterGroup;
}

/**
 * Raw response from the Entity API
 */
export interface RawQueryResponseJson {
  jsonValue: string | null;
  totalRecordCount: number;
  value?: any[] | null;
}

/**
 * Response structure for entity queries
 */
export interface EntityQueryResponse<T = EntityData> extends PaginatedResponse<T> {
  jsonValue?: string;
}

/**
 * Generic entity data type
 */
export interface EntityData {
  id: string;
  name: string;
  [key: string]: unknown;
}

/**
 * Transform user-friendly filter to API filter
 */
export function transformFilter(filter: FilterExpression | undefined): ApiQueryFilterGroup | undefined {
  if (!filter) return undefined;

  return {
    logicalOperator: filter.operator === LogicalOperator.And ? 0 : 1,
    queryFilters: filter.conditions
      .filter((c): c is FilterCondition => 'field' in c && 'value' in c)
      .map(condition => ({
        fieldName: condition.field,
        operator: condition.operator,
        value: condition.value?.toString(),
        valueList: Array.isArray(condition.value) ? condition.value.map(v => v.toString()) : undefined
      })),
    filterGroups: filter.conditions
      .filter((c): c is FilterExpression => 'conditions' in c && Array.isArray(c.conditions))
      .map(transformFilter)
      .filter((group): group is ApiQueryFilterGroup => group !== undefined),
    expansions: filter.expansions?.map(transformExpansion)
  };
}

/**
 * Transform user-friendly expansion to API expansion
 */
export function transformExpansion(expansion: ExpansionOption): ApiExpansion {
  return {
    expandedField: expansion.field,
    selectedFields: expansion.select,
    expansions: expansion.expand?.map(transformExpansion),
    alias: expansion.alias,
    leftTableName: expansion.leftTableName,
    leftEntityId: expansion.leftEntityId,
    tableName: expansion.tableName
  };
}

/**
 * Transform raw API response to typed response
 */
export function transformQueryResponse<T>(response: RawQueryResponseJson): EntityQueryResponse<T> {
  let value: T[] | null = null;
  
  if (response.jsonValue) {
    try {
      value = JSON.parse(response.jsonValue);
    } catch (e) {
      console.warn('Failed to parse jsonValue:', e);
    }
  }
  else if (response.value) {
    value = response.value as T[];
  }

  return {
    value: value || [],
    totalRecordCount: response.totalRecordCount,
    jsonValue: response.jsonValue || undefined
  };
}

/**
 * Entity type enumeration
 */
export enum EntityType {
  Entity = "Entity",
  ChoiceSet = "ChoiceSet",
  InternalEntity = "InternalEntity",
  SystemEntity = "SystemEntity"
}

/**
 * Reference type enumeration
 */
export enum ReferenceType {
  None = 0,
  OneToOne = 1,
  OneToMany = 2,
  ManyToOne = 3,
  ManyToMany = 4
}

/**
 * SQL type enumeration
 */
export enum SqlType {
  Boolean = 0,
  Int = 1,
  Float = 2,
  String = 3,
  DateTime = 4,
  Guid = 5,
  Binary = 6
}

/**
 * Field display type enumeration
 */
export enum FieldDisplayType {
  Default = 0,
  TextBox = 1,
  TextArea = 2,
  Number = 3,
  Date = 4,
  DateTime = 5,
  Time = 6,
  Email = 7,
  Phone = 8,
  Checkbox = 9,
  DropDown = 10,
  Radio = 11,
  Lookup = 12,
  Image = 13,
  File = 14,
  Currency = 15,
  Url = 16,
  Password = 17,
  RichText = 18
}

/**
 * Field definition
 */
export interface Field {
  id: string;
  name?: string;
  // Additional properties as needed
}

/**
 * Field definition
 */
export interface FieldDefinition {
  id: string;
  name?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isExternalField: boolean;
  isHiddenField: boolean;
  fieldCategoryId: number;
  isUnique: boolean;
  referenceName?: string;
  referenceEntity?: EntityRecord;
  referenceChoiceSet?: EntityRecord;
  referenceField?: Field;
  referenceType?: ReferenceType;
  sqlType?: SqlType;
  isRequired: boolean;
  displayName?: string;
  description?: string;
  createTime: string;
  createdBy: string;
  updateTime: string;
  updatedBy: string;
  isSystemField: boolean;
  fieldDisplayType?: FieldDisplayType;
  choiceSetId?: string;
  defaultValue?: string;
  isAttachment: boolean;
  isRbacEnabled: boolean;
  isModelReserved: boolean;
}

/**
 * External source fields
 */
export interface ExternalSourceFields {
  // Define properties as needed
}

/**
 * Source join criteria
 */
export interface SourceJoinCriteria {
  // Define properties as needed
}

/**
 * Entity record
 */
export interface EntityRecord {
  name?: string;
  displayName?: string;
  entityTypeId: number;
  entityType?: EntityType;
  description?: string;
  fields?: FieldDefinition[];
  externalFields?: ExternalSourceFields[];
  sourceJoinCriterias?: SourceJoinCriteria[];
  recordCount?: number;
  storageSizeInMB?: number;
  usedStorageSizeInMB?: number;
  attachmentSizeInByte?: number;
  isRbacEnabled: boolean;
  invalidIdentifiers?: string[];
  isModelReserved: boolean;
  categoryId?: number;
  id: string;
  createdBy: string;
  createTime: string;
  updateTime?: string;
  updatedBy?: string;
} 