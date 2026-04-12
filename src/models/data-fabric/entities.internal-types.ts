import { FieldDisplayType } from './entities.types';

/**
 * Shape of each entry in EntitySchemaFieldTypeMap. Internal only.
 */
export interface EntitySchemaFieldMapping {
  apiType: string;
  fieldDisplayType: FieldDisplayType;
}

/**
 * Internal field payload used when creating or updating entity schemas.
 * Not part of the public API.
 */
export interface EntitySchemaField {
  id?: string;
  name: string;
  displayName: string;
  type: string;
  description: string;
  isRequired: boolean;
  fieldDisplayType: FieldDisplayType;
  choiceSetId?: string;
  defaultValue?: string;
  isRbacEnabled: boolean;
  isUnique: boolean;
  isEncrypted: boolean;
}

/**
 * Internal type for the query response shape returned by the entity query API.
 */
export interface EntityQueryRawResponse {
  value?: import('./entities.types').EntityRecord[];
  totalRecordCount?: number;
}
