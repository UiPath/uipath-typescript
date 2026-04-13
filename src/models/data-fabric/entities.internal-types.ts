import { FieldDisplayType } from './entities.types';

/**
 * Shape of each entry in EntitySchemaFieldTypeMap. Internal only.
 */
export interface EntitySchemaFieldMapping {
  sqlTypeName: string;
  fieldDisplayType: FieldDisplayType;
}


/**
 * Internal type for the query response shape returned by the entity query API.
 */
export interface EntityQueryRawResponse {
  value?: import('./entities.types').EntityRecord[];
  totalRecordCount?: number;
}
