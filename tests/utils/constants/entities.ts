/**
 * Entity service test constants
 * Entity-specific constants only
 */

export const ENTITY_TEST_CONSTANTS = {
  // Entity IDs
  ENTITY_ID: 'e1234567-e89b-12d3-a456-426614174000',
  
  // Record IDs
  RECORD_ID: 'r1234567-e89b-12d3-a456-426614174000',
  RECORD_ID_2: 'r2234567-e89b-12d3-a456-426614174001',
  
  // Field IDs
  FIELD_ID: 'f1234567-e89b-12d3-a456-426614174000',
  FIELD_ID_NAME: 'f2234567-e89b-12d3-a456-426614174001',
  FIELD_ID_AGE: 'f3234567-e89b-12d3-a456-426614174002',
  
  // Entity Metadata
  ENTITY_NAME: 'Customer',
  ENTITY_DISPLAY_NAME: 'Customer Entity',
  ENTITY_DESCRIPTION: 'Customer entity for testing',
  
  // Field Names
  FIELD_NAME: 'name',
  FIELD_AGE: 'age',
  FIELD_EXTERNAL_FIELD: 'externalField',
  ATTACHMENT_FIELD_NAME: 'Documents',
  
  // Reference Entity Names
  REFERENCE_ENTITY_CUSTOMER: 'Customer',
  REFERENCE_CHOICESET_STATUS: 'StatusChoiceSet',
  REFERENCE_FIELD_DEF: 'relatedFieldDef',
  
  // Field Data Type Names (for assertions)
  FIELD_TYPE_UUID: 'UUID',
  FIELD_TYPE_STRING: 'STRING',
  FIELD_TYPE_INTEGER: 'INTEGER',
  FIELD_TYPE_DATETIME: 'DATETIME',
  FIELD_TYPE_BOOLEAN: 'BOOLEAN',
  FIELD_TYPE_DECIMAL: 'DECIMAL',
  FIELD_TYPE_NVARCHAR: 'NVARCHAR', // SQL type
  
  // User Information
  USER_ID: 'u1234567-e89b-12d3-a456-426614174000',
  
  // Timestamps
  CREATED_TIME: '2025-01-15T10:00:00Z',
  UPDATED_TIME: '2025-01-15T12:00:00Z',
  
  // Test Data
  TEST_RECORD_DATA: {
    name: 'John Doe',
    age: 30,
    email: 'john@example.com'
  },
  
  TEST_RECORD_DATA_2: {
    name: 'Jane Smith',
    age: 25,
    email: 'jane@example.com'
  },
  
  // Test Data Values
  TEST_INVALID_RECORD_NAME: 'Invalid',
  TEST_VALID_UPDATE_NAME: 'Valid Update',
  TEST_INVALID_UPDATE_NAME: 'Invalid Update',
  TEST_JOHN_UPDATED_NAME: 'John Updated',
  TEST_JANE_UPDATED_NAME: 'Jane Updated',
  TEST_JOHN_UPDATED_AGE: 31,
  TEST_JANE_UPDATED_AGE: 26,
  TEST_UPDATED_NAME: 'Updated',
  TEST_INVALID_ID: 'invalid-id',
  
  // Operation Options
  EXPANSION_LEVEL: 1,
  FAIL_ON_FIRST: true,
  
  // External Connection
  EXTERNAL_CONNECTION_ID: 'c1234567-e89b-12d3-a456-426614174000',
  EXTERNAL_OBJECT_ID: 'o1234567-e89b-12d3-a456-426614174000',
  EXTERNAL_FIELD_MAPPING_ID: 'm1234567-e89b-12d3-a456-426614174000',
  
  // Error Messages
  ERROR_MESSAGE: 'Record not found',
  ERROR_MESSAGE_INSERT_UNIQUENESS: 'Insert data failed. Value uniqueness violation.',
  ERROR_MESSAGE_ENTITY_ID_UNDEFINED: 'Entity ID is undefined',
  ERROR_MESSAGE_ENTITY_NAME_UNDEFINED: 'Entity name is undefined',
} as const;

