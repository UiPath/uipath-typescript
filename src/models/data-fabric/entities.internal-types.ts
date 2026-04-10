import { FieldDisplayType } from './entities.types';
import { SqlFieldType } from './entities.constants';

/**
 * Internal field payload used when creating or updating entity schemas.
 * Not part of the public API.
 */
export interface EntitySchemaField {
  name: string;
  displayName: string;
  type: string;
  description: string;
  isRequired: boolean;
  fieldDisplayType: FieldDisplayType;
  sqlType: { name: SqlFieldType; lengthLimit?: number };
  choiceSetId: string | null;
  defaultValue: string | null;
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
