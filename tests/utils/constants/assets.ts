/**
 * Asset service test constants
 * Asset-specific constants only
 */

export const ASSET_TEST_CONSTANTS = {
  // Asset IDs
  ASSET_ID: 123,
  
  // Asset Metadata
  ASSET_NAME: 'DatabaseConnection',
  ASSET_KEY: '12345678-1234-1234-1234-123456789abc',
  ASSET_DESCRIPTION: 'Database connection string for production',
  
  // Asset Values
  ASSET_VALUE: 'Server=myServerAddress;Database=myDataBase;User Id=myUsername;Password=myPassword;',
  
  // Timestamps
  CREATED_TIME: '2023-10-15T10:00:00Z',
  LAST_MODIFIED_TIME: '2023-10-20T15:30:00Z',
  
  // User IDs
  LAST_MODIFIER_USER_ID: 102,
  
  // Key-Value List Items
  KEY_VALUE_ITEM_1_KEY: 'environment',
  KEY_VALUE_ITEM_1_VALUE: 'production',
  KEY_VALUE_ITEM_2_KEY: 'region',
  KEY_VALUE_ITEM_2_VALUE: 'us-east-1',
  
  // Error Messages
  ERROR_ASSET_NOT_FOUND: 'Asset not found',
  
  // OData Parameters
  ODATA_EXPAND_KEY_VALUE_LIST: 'keyValueList',
  ODATA_SELECT_FIELDS: 'id,name,value',
} as const;
