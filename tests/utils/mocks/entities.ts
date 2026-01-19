/**
 * Entities service mock utilities - Entity-specific mocks only
 * Uses generic utilities from core.ts for base functionality
 */

import {
  EntityType,
  EntityFieldDataType,
  ReferenceType,
  FieldDisplayType,
  DataDirectionType,
  RawEntityGetResponse,
  EntityRecord,
  EntitySingleInsertResponse,
  EntityInsertResponse,
  EntityUpdateResponse,
  EntityDeleteResponse
} from '../../../src/models/data-fabric/entities.types';
import { createMockBaseResponse, createMockCollection } from './core';
import { ENTITY_TEST_CONSTANTS } from '../constants/entities';
import { TEST_CONSTANTS } from '../constants/common';

// Entity-Specific Mock Factories

/**
 * Creates a mock FieldMetaData object with RAW API response format
 * This uses raw field names (sqlType, createTime, updateTime) that will be transformed by the service
 * @param overrides - Optional overrides for specific fields
 * @returns Mock FieldMetaData object as it comes from the API (before transformation)
 */
export const createMockFieldMetaData = (overrides: Partial<any> = {}): any => {
  return createMockBaseResponse({
    id: ENTITY_TEST_CONSTANTS.FIELD_ID,
    name: ENTITY_TEST_CONSTANTS.FIELD_NAME,
    isPrimaryKey: false,
    isForeignKey: false,
    isExternalField: false,
    isHiddenField: false,
    isUnique: false,
    referenceType: ReferenceType.ManyToOne,
    // RAW API field name: sqlType (will be transformed to fieldDataType)
    sqlType: {
      name: 'NVARCHAR',  // Raw SQL type from API (will be transformed to STRING)
      lengthLimit: 255
    },
    isRequired: false,
    displayName: 'Name',
    description: 'Name field',
    // RAW API field names: createTime/updateTime (will be transformed to createdTime/updatedTime)
    createTime: ENTITY_TEST_CONSTANTS.CREATED_TIME,
    createdBy: ENTITY_TEST_CONSTANTS.USER_ID,
    updateTime: ENTITY_TEST_CONSTANTS.UPDATED_TIME,
    updatedBy: ENTITY_TEST_CONSTANTS.USER_ID,
    isSystemField: false,
    fieldDisplayType: FieldDisplayType.Basic,
    isAttachment: false,
    isRbacEnabled: false,
  }, overrides);
};

/**
 * Creates a mock Entity response with RAW API format (before transformation)
 * Uses raw field names: sqlType, createTime, updateTime (not fieldDataType, createdTime, updatedTime)
 * @param overrides - Optional overrides for specific fields
 * @returns Mock Entity response object as it comes from the API (before transformation)
 */
export const createMockEntityResponse = (overrides: Partial<any> = {}): any => {
  return createMockBaseResponse({
    id: ENTITY_TEST_CONSTANTS.ENTITY_ID,
    name: ENTITY_TEST_CONSTANTS.ENTITY_NAME,
    displayName: ENTITY_TEST_CONSTANTS.ENTITY_DISPLAY_NAME,
    entityType: EntityType.Entity,
    description: ENTITY_TEST_CONSTANTS.ENTITY_DESCRIPTION,
    fields: [
      createMockFieldMetaData({
        id: ENTITY_TEST_CONSTANTS.FIELD_ID,
        name: 'id',
        isPrimaryKey: true,
        sqlType: {  // RAW API field name (will be transformed to fieldDataType)
          name: 'UNIQUEIDENTIFIER'  // Raw SQL type (will be transformed to UUID)
        },
        displayName: 'ID',
        description: 'Primary key'
      }),
      createMockFieldMetaData({
        id: ENTITY_TEST_CONSTANTS.FIELD_ID_NAME,
        name: ENTITY_TEST_CONSTANTS.FIELD_NAME,
        sqlType: {  // RAW API field name (will be transformed to fieldDataType)
          name: 'NVARCHAR',  // Raw SQL type (will be transformed to STRING)
          lengthLimit: 255
        },
        displayName: 'Name',
        description: 'Customer name'
      }),
      createMockFieldMetaData({
        id: ENTITY_TEST_CONSTANTS.FIELD_ID_AGE,
        name: ENTITY_TEST_CONSTANTS.FIELD_AGE,
        sqlType: {  // RAW API field name (will be transformed to fieldDataType)
          name: 'INT'  // Raw SQL type (will be transformed to INTEGER)
        },
        displayName: 'Age',
        description: 'Customer age'
      })
    ],
    externalFields: [],
    sourceJoinCriterias: [],
    isRbacEnabled: false,
    createdBy: ENTITY_TEST_CONSTANTS.USER_ID,
    // RAW API field names: createTime/updateTime (will be transformed to createdTime/updatedTime)
    createTime: ENTITY_TEST_CONSTANTS.CREATED_TIME,
    updateTime: ENTITY_TEST_CONSTANTS.UPDATED_TIME,
    updatedBy: ENTITY_TEST_CONSTANTS.USER_ID,
  }, overrides);
};

/**
 * Creates a basic entity for model tests with TRANSFORMED data (not raw API format)
 * @param overrides - Optional overrides for specific fields
 * @returns Basic entity response object with transformed field names
 */
export const createBasicEntity = (overrides: Partial<RawEntityGetResponse> = {}): RawEntityGetResponse => {
  return createMockBaseResponse({
    id: ENTITY_TEST_CONSTANTS.ENTITY_ID,
    name: ENTITY_TEST_CONSTANTS.ENTITY_NAME,
    displayName: ENTITY_TEST_CONSTANTS.ENTITY_DISPLAY_NAME,
    entityType: EntityType.Entity,
    description: ENTITY_TEST_CONSTANTS.ENTITY_DESCRIPTION,
    fields: [
      createMockBaseResponse({
        id: ENTITY_TEST_CONSTANTS.FIELD_ID,
        name: 'id',
        isPrimaryKey: true,
        isForeignKey: false,
        isExternalField: false,
        isHiddenField: false,
        isUnique: false,
        referenceType: ReferenceType.ManyToOne,
        fieldDataType: {  // TRANSFORMED field name (model tests need this)
          name: EntityFieldDataType.UUID  // TRANSFORMED type (model tests need this)
        },
        isRequired: true,
        displayName: 'ID',
        description: 'Primary key',
        createdTime: ENTITY_TEST_CONSTANTS.CREATED_TIME,  // TRANSFORMED field name
        createdBy: ENTITY_TEST_CONSTANTS.USER_ID,
        updatedTime: ENTITY_TEST_CONSTANTS.UPDATED_TIME,  // TRANSFORMED field name
        updatedBy: ENTITY_TEST_CONSTANTS.USER_ID,
        isSystemField: false,
        fieldDisplayType: FieldDisplayType.Basic,
        isAttachment: false,
        isRbacEnabled: false,
      }),
      createMockBaseResponse({
        id: ENTITY_TEST_CONSTANTS.FIELD_ID_NAME,
        name: ENTITY_TEST_CONSTANTS.FIELD_NAME,
        isPrimaryKey: false,
        isForeignKey: false,
        isExternalField: false,
        isHiddenField: false,
        isUnique: false,
        referenceType: ReferenceType.ManyToOne,
        fieldDataType: {  // TRANSFORMED field name (model tests need this)
          name: EntityFieldDataType.STRING,  // TRANSFORMED type (model tests need this)
          lengthLimit: 255
        },
        isRequired: false,
        displayName: 'Name',
        description: 'Customer name',
        createdTime: ENTITY_TEST_CONSTANTS.CREATED_TIME,  // TRANSFORMED field name
        createdBy: ENTITY_TEST_CONSTANTS.USER_ID,
        updatedTime: ENTITY_TEST_CONSTANTS.UPDATED_TIME,  // TRANSFORMED field name
        updatedBy: ENTITY_TEST_CONSTANTS.USER_ID,
        isSystemField: false,
        fieldDisplayType: FieldDisplayType.Basic,
        isAttachment: false,
        isRbacEnabled: false,
      }),
      createMockBaseResponse({
        id: ENTITY_TEST_CONSTANTS.FIELD_ID_AGE,
        name: ENTITY_TEST_CONSTANTS.FIELD_AGE,
        isPrimaryKey: false,
        isForeignKey: false,
        isExternalField: false,
        isHiddenField: false,
        isUnique: false,
        referenceType: ReferenceType.ManyToOne,
        fieldDataType: {  // TRANSFORMED field name (model tests need this)
          name: EntityFieldDataType.INTEGER  // TRANSFORMED type (model tests need this)
        },
        isRequired: false,
        displayName: 'Age',
        description: 'Customer age',
        createdTime: ENTITY_TEST_CONSTANTS.CREATED_TIME,  // TRANSFORMED field name
        createdBy: ENTITY_TEST_CONSTANTS.USER_ID,
        updatedTime: ENTITY_TEST_CONSTANTS.UPDATED_TIME,  // TRANSFORMED field name
        updatedBy: ENTITY_TEST_CONSTANTS.USER_ID,
        isSystemField: false,
        fieldDisplayType: FieldDisplayType.Basic,
        isAttachment: false,
        isRbacEnabled: false,
      })
    ],
    externalFields: [],
    sourceJoinCriterias: [],
    isRbacEnabled: false,
    createdBy: ENTITY_TEST_CONSTANTS.USER_ID,
    createdTime: ENTITY_TEST_CONSTANTS.CREATED_TIME,  // TRANSFORMED field name
    updatedTime: ENTITY_TEST_CONSTANTS.UPDATED_TIME,  // TRANSFORMED field name
    updatedBy: ENTITY_TEST_CONSTANTS.USER_ID,
  }, overrides);
};

/**
 * Creates a collection of mock entities
 * @param count - Number of entities to create
 * @returns Array of mock entities
 */
export const createMockEntities = (count: number): RawEntityGetResponse[] => {
  return createMockCollection(count, (i) => 
    createMockEntityResponse({
      id: `e${i}234567-e89b-12d3-a456-42661417400${i}`,
      name: `Entity${i + 1}`,
      displayName: `Entity ${i + 1}`,
      description: `Test entity ${i + 1}`,
    })
  );
};

/**
 * Creates a mock EntityRecord with common reference fields
 * @param overrides - Optional overrides for specific fields
 * @returns Mock EntityRecord object
 */
export const createMockEntityRecord = (overrides: Partial<EntityRecord> = {}): EntityRecord => {
  return createMockBaseResponse({
    id: ENTITY_TEST_CONSTANTS.RECORD_ID,
    name: ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA.name,
    age: ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA.age,
    email: ENTITY_TEST_CONSTANTS.TEST_RECORD_DATA.email,
    recordOwner: ENTITY_TEST_CONSTANTS.USER_ID,
    createdBy: ENTITY_TEST_CONSTANTS.USER_ID,
    updatedBy: ENTITY_TEST_CONSTANTS.USER_ID,
  }, overrides);
};

/**
 * Creates a collection of mock entity records
 * @param count - Number of records to create
 * @param options - Optional: expansionLevel to expand reference fields
 * @returns Array of mock entity records
 */
export const createMockEntityRecords = (
  count: number,
  options?: { expansionLevel?: number }
): EntityRecord[] => {
  const records = createMockCollection(count, (i) => 
    createMockEntityRecord({
      id: `r${i}234567-e89b-12d3-a456-42661417400${i}`,
      name: `Record ${i + 1}`,
      age: 20 + i,
      email: `record${i + 1}@example.com`,
    })
  );

  // If expansionLevel is specified, expand reference fields
  if (options?.expansionLevel && options.expansionLevel > 0) {
    return records.map(record => expandRecordReferenceFields(record));
  }

  return records;
};

/**
 * Expands reference fields (like recordOwner, createdBy, updatedBy) from string IDs to objects
 * This simulates the API behavior when expansionLevel > 0
 * @param record - Record with string reference fields
 * @returns Record with expanded reference fields
 */
export const expandRecordReferenceFields = (record: EntityRecord): EntityRecord => {
  const expanded: EntityRecord = { ...record };
  
  // Expand reference fields that are typically string IDs
  const referenceFields = ['recordOwner', 'createdBy', 'updatedBy'];
  
  referenceFields.forEach(field => {
    if (expanded[field] && typeof expanded[field] === 'string') {
      expanded[field] = { id: expanded[field] as string };
    }
  });
  
  return expanded;
};

/**
 * Creates a mock single insert response that echoes back the request data with a generated ID
 * This is for the /insert endpoint which inserts a single record
 * @param requestData - Single record being inserted
 * @param options - Optional: expansionLevel to expand reference fields
 * @returns Mock EntitySingleInsertResponse (the inserted record with generated ID)
 *
 * @example
 * // Basic insert
 * const response = createMockSingleInsertResponse({ name: 'John', age: 30 });
 * // Returns: { name: 'John', age: 30, id: 'generated-id-1' }
 *
 * // With expansion level - reference fields are expanded
 * const response = createMockSingleInsertResponse(
 *   { name: 'John', recordOwner: 'user-id-123' },
 *   { expansionLevel: 1 }
 * );
 * // Returns: { name: 'John', recordOwner: { id: 'user-id-123' }, id: 'generated-id-1' }
 */
export const createMockSingleInsertResponse = (
  requestData: Record<string, any>,
  options?: { expansionLevel?: number }
): EntitySingleInsertResponse => {
  let result: EntitySingleInsertResponse = {
    ...requestData,
    id: 'generated-id-1'
  };

  // If expansionLevel is specified, expand reference fields in the response
  if (options?.expansionLevel && options.expansionLevel > 0) {
    result = expandRecordReferenceFields(result);
  }

  return result;
};

/**
 * Creates a mock EntityInsertResponse that echoes back the request data with generated IDs
 * This is for the /insert-batch endpoint which inserts multiple records
 * @param requestData - Array of records being inserted
 * @param options - Optional: successCount to control partial failures, expansionLevel to expand reference fields
 * @returns Mock EntityInsertResponse
 *
 * @example
 * // All records succeed
 * const response = createMockInsertResponse([
 *   { name: 'John', age: 30 },
 *   { name: 'Jane', age: 25 }
 * ]);
 * // Returns: {
 * //   successRecords: [
 * //     { name: 'John', age: 30, id: 'generated-id-1' },
 * //     { name: 'Jane', age: 25, id: 'generated-id-2' }
 * //   ],
 * //   failureRecords: []
 * // }
 *
 * // Partial failure - first record succeeds, second fails
 * const response = createMockInsertResponse(
 *   [{ name: 'Valid' }, { name: 'Invalid', age: null }],
 *   { successCount: 1 }
 * );
 *
 * // With expansion level - reference fields are expanded
 * const response = createMockInsertResponse(
 *   [{ name: 'John', recordOwner: 'user-id-123' }],
 *   { expansionLevel: 1 }
 * );
 * // Returns: { successRecords: [{ name: 'John', recordOwner: { id: 'user-id-123' }, id: 'generated-id-1' }] }
 */
export const createMockInsertResponse = (
  requestData: Record<string, any>[],
  options?: { successCount?: number; expansionLevel?: number }
): EntityInsertResponse => {
  const successCount = options?.successCount ?? requestData.length;
  
  let successRecords = requestData.slice(0, successCount).map((record, i) => ({
    ...record,
    id: `generated-id-${i + 1}`
  }));
  
  // If expansionLevel is specified, expand reference fields in the response
  if (options?.expansionLevel && options.expansionLevel > 0) {
    successRecords = successRecords.map(record => expandRecordReferenceFields(record));
  }
  
  const failureRecords = requestData.slice(successCount).map((record) => ({
    error: ENTITY_TEST_CONSTANTS.ERROR_MESSAGE_INSERT_UNIQUENESS,
    record
  }));

  return { successRecords, failureRecords };
};

/**
 * Creates a mock EntityUpdateResponse that echoes back the request data
 * @param requestData - Array of records being updated
 * @param options - Optional: successCount to control partial failures, expansionLevel to expand reference fields
 * @returns Mock EntityUpdateResponse
 * 
 * @example
 * // All records succeed
 * const response = createMockUpdateResponse([
 *   { id: '123', name: 'John Updated', age: 31 },
 *   { id: '456', name: 'Jane Updated', age: 26 }
 * ]);
 * // Returns: { 
 * //   successRecords: [
 * //     { id: '123', name: 'John Updated', age: 31 },
 * //     { id: '456', name: 'Jane Updated', age: 26 }
 * //   ],
 * //   failureRecords: []
 * // }
 * 
 * // Partial failure - first record succeeds, second fails
 * const response = createMockUpdateResponse(
 *   [{ id: 'valid-id', name: 'Valid' }, { id: 'invalid-id', name: 'Invalid' }],
 *   { successCount: 1 }
 * );
 * 
 * // With expansion level - reference fields are expanded
 * const response = createMockUpdateResponse(
 *   [{ id: '123', name: 'John', recordOwner: 'user-id-123' }],
 *   { expansionLevel: 1 }
 * );
 */
export const createMockUpdateResponse = (
  requestData: EntityRecord[],
  options?: { successCount?: number; expansionLevel?: number }
): EntityUpdateResponse => {
  const successCount = options?.successCount ?? requestData.length;
  
  let successRecords = requestData.slice(0, successCount);
  
  // If expansionLevel is specified, expand reference fields in the response
  if (options?.expansionLevel && options.expansionLevel > 0) {
    successRecords = successRecords.map(record => expandRecordReferenceFields(record));
  }
  
  const failureRecords = requestData.slice(successCount).map((record, i) => ({
    error: `${ENTITY_TEST_CONSTANTS.ERROR_MESSAGE} for record ${successCount + i + 1}`,
    record
  }));

  return { successRecords, failureRecords };
};

/**
 * Creates a mock EntityDeleteResponse that echoes back the request IDs
 * @param requestIds - Array of IDs being deleted
 * @param options - Optional: successCount to control partial failures
 * @returns Mock EntityDeleteResponse
 * 
 * @example
 * // All deletions succeed
 * const response = createMockDeleteResponse(['123', '456']);
 * // Returns: { 
 * //   successRecords: [{ id: '123' }, { id: '456' }],
 * //   failureRecords: []
 * // }
 * 
 * // Partial failure - first deletion succeeds, second fails
 * const response = createMockDeleteResponse(
 *   ['valid-id', 'invalid-id'],
 *   { successCount: 1 }
 * );
 */
export const createMockDeleteResponse = (
  requestIds: string[],
  options?: { successCount?: number }
): EntityDeleteResponse => {
  const successCount = options?.successCount ?? requestIds.length;
  
  const successRecords = requestIds.slice(0, successCount).map(id => ({ id }));
  
  const failureRecords = requestIds.slice(successCount).map((id) => ({
    error: `${ENTITY_TEST_CONSTANTS.ERROR_MESSAGE} for id: ${id}`,
    record: { id }
  }));

  return { successRecords, failureRecords };
};

/**
 * Creates a mock entity with SQL field types (as returned by API) for testing field type mapping
 * Uses RAW API field name: sqlType (not fieldDataType)
 * @returns Mock entity with SQL field types
 */
export const createMockEntityWithSqlFieldTypes = (): any => {
  return createMockEntityResponse({
    fields: [
      // UUID field (UNIQUEIDENTIFIER -> UUID)
      {
        ...createMockFieldMetaData({
          id: 'field-uuid-id',
          name: 'id',
          displayName: 'ID',
          isPrimaryKey: true
        }),
        sqlType: {  // RAW API field name (will be transformed to fieldDataType)
          name: 'UNIQUEIDENTIFIER'  // SQL type from API
        }
      },
      // String field (NVARCHAR -> STRING)
      {
        ...createMockFieldMetaData({
          id: 'field-string-id',
          name: 'name',
          displayName: 'Name'
        }),
        sqlType: {  // RAW API field name (will be transformed to fieldDataType)
          name: 'NVARCHAR',  // SQL type from API
          lengthLimit: 255
        }
      },
      // Integer field (INT -> INTEGER)
      {
        ...createMockFieldMetaData({
          id: 'field-int-id',
          name: 'age',
          displayName: 'Age'
        }),
        sqlType: {  // RAW API field name (will be transformed to fieldDataType)
          name: 'INT'  // SQL type from API
        }
      },
      // DateTime field (DATETIME2 -> DATETIME)
      {
        ...createMockFieldMetaData({
          id: 'field-datetime-id',
          name: 'createdDate',
          displayName: 'Created Date'
        }),
        sqlType: {  // RAW API field name (will be transformed to fieldDataType)
          name: 'DATETIME2'  // SQL type from API
        }
      },
      // Boolean field (BIT -> BOOLEAN)
      {
        ...createMockFieldMetaData({
          id: 'field-bool-id',
          name: 'isActive',
          displayName: 'Is Active'
        }),
        sqlType: {  // RAW API field name (will be transformed to fieldDataType)
          name: 'BIT'  // SQL type from API
        }
      },
      // Decimal field (DECIMAL -> DECIMAL)
      {
        ...createMockFieldMetaData({
          id: 'field-decimal-id',
          name: 'price',
          displayName: 'Price'
        }),
        sqlType: {  // RAW API field name (will be transformed to fieldDataType)
          name: 'DECIMAL',  // SQL type from API
          decimalPrecision: 2
        }
      }
    ]
  });
};

/**
 * Creates a mock entity with nested reference fields for testing transformNestedReferences
 * Uses RAW API field names: sqlType, createTime, updateTime
 * @returns Mock entity with reference fields
 */
export const createMockEntityWithNestedReferences = (): any => {
  return createMockEntityResponse({
    fields: [
      // Field with referenceEntity
      createMockFieldMetaData({
        id: 'field-ref-entity-id',
        name: 'customerId',
        displayName: 'Customer',
        fieldDisplayType: FieldDisplayType.Relationship,
        referenceEntity: {
          id: 'ref-entity-id',
          name: 'Customer',
          displayName: 'Customer Entity',
          entityType: EntityType.Entity,
          description: 'Referenced customer entity',
          fields: [],
          isRbacEnabled: false,
          createdBy: TEST_CONSTANTS.USER_EMAIL,
          createTime: ENTITY_TEST_CONSTANTS.CREATED_TIME  // RAW API field name
        }
      }),
      // Field with referenceChoiceSet
      createMockFieldMetaData({
        id: 'field-ref-choiceset-id',
        name: 'status',
        displayName: 'Status',
        fieldDisplayType: FieldDisplayType.ChoiceSetSingle,
        referenceChoiceSet: {
          id: 'ref-choiceset-id',
          name: 'StatusChoiceSet',
          displayName: 'Status Choice Set',
          entityType: EntityType.ChoiceSet,
          description: 'Status options',
          fields: [],
          isRbacEnabled: false,
          createdBy: TEST_CONSTANTS.USER_EMAIL,
          createTime: ENTITY_TEST_CONSTANTS.CREATED_TIME  // RAW API field name
        }
      }),
      // Field with referenceField.definition
      createMockFieldMetaData({
        id: 'field-ref-field-id',
        name: 'relatedField',
        displayName: 'Related Field',
        referenceField: {
          id: 'ref-field-id',
          // NOTE: referenceField has a 'definition' property containing raw field metadata
          definition: {
            id: 'ref-field-def-id',
            name: 'relatedFieldDef',
            displayName: 'Related Field Definition',
            isPrimaryKey: false,
            isForeignKey: false,
            isExternalField: false,
            isHiddenField: false,
            isUnique: false,
            referenceType: ReferenceType.ManyToOne,
            sqlType: {  // RAW API field name (will be transformed to fieldDataType)
              name: 'NVARCHAR'  // SQL type (will be transformed to STRING)
            },
            isRequired: false,
            description: 'Referenced field definition',
            createTime: ENTITY_TEST_CONSTANTS.CREATED_TIME,  // RAW API field name
            createdBy: TEST_CONSTANTS.USER_EMAIL,
            updateTime: ENTITY_TEST_CONSTANTS.UPDATED_TIME,  // RAW API field name
            isSystemField: false,
            isAttachment: false,
            isRbacEnabled: false
          }
        }
      })
    ]
  });
};

/**
 * Creates a mock entity with external fields for testing
 * Uses RAW API field name: fieldDefinition (will be transformed to fieldMetaData)
 * @returns Mock entity with external fields
 */
export const createMockEntityWithExternalFields = (): any => {
  return createMockEntityResponse({
    externalFields: [
      {
        fields: [
          {
            // RAW API field name: fieldDefinition (will be transformed to fieldMetaData)
            fieldDefinition: createMockFieldMetaData({
              id: ENTITY_TEST_CONSTANTS.FIELD_ID,
              name: 'externalField',
              isExternalField: true,
              displayName: 'External Field'
            }),
            externalFieldMappingDetail: {
              id: ENTITY_TEST_CONSTANTS.EXTERNAL_FIELD_MAPPING_ID,
              externalFieldName: 'external_field',
              externalFieldDisplayName: 'External Field',
              externalObjectId: ENTITY_TEST_CONSTANTS.EXTERNAL_OBJECT_ID,
              externalFieldType: 'STRING',
              internalFieldId: ENTITY_TEST_CONSTANTS.FIELD_ID,
              directionType: DataDirectionType.ReadAndWrite
            }
          }
        ],
        externalObjectDetail: {
          id: ENTITY_TEST_CONSTANTS.EXTERNAL_OBJECT_ID,
          externalObjectName: 'ExternalObject',
          externalObjectDisplayName: 'External Object',
          primaryKey: 'id',
          externalConnectionId: ENTITY_TEST_CONSTANTS.EXTERNAL_CONNECTION_ID,
          entityId: ENTITY_TEST_CONSTANTS.ENTITY_ID,
          isPrimarySource: true
        },
        externalConnectionDetail: {
          id: ENTITY_TEST_CONSTANTS.EXTERNAL_CONNECTION_ID,
          connectionId: 'conn-123',
          elementInstanceId: TEST_CONSTANTS.FOLDER_ID,
          folderKey: 'test-folder',
          connectorKey: 'salesforce',
          connectorName: 'Salesforce',
          connectionName: 'My Salesforce Connection'
        }
      }
    ]
  });
};

